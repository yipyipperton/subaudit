"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CATEGORIES, type Subscription, type SubscriptionInput } from "@/lib/types";
import { newId, todayISO } from "@/lib/calc";
import { demoSubs } from "@/lib/demo";

export type Status = {
  authEnabled: boolean;
  providers: { email: boolean; github: boolean };
  ai: boolean;
  emailReminders: boolean;
  user: { id: string; email?: string | null; name?: string | null } | null;
};
export type Mode = "local" | "cloud" | "demo";

const LS_SUBS = "subaudit:v1:subs";
const LS_CATS = "subaudit:v1:categories";
const LS_CLOUD = "subaudit:v1:cloud";
const LS_DISMISSED = "subaudit:v1:dismissed";

type Ctx = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  status: Status | null;
  mode: Mode;
  subs: Subscription[];
  localCount: number;
  categories: string[];
  setCategories: (c: string[]) => void;
  add: (i: SubscriptionInput) => Promise<void>;
  addMany: (i: SubscriptionInput[]) => Promise<void>;
  update: (id: string, i: SubscriptionInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  patch: (id: string, p: Partial<SubscriptionInput>) => Promise<void>;
  enableCloud: (importLocal: boolean) => Promise<void>;
  disableCloud: () => void;
  dismissed: string[];
  dismiss: (key: string) => void;
  reload: () => Promise<void>;
};

const C = createContext<Ctx | null>(null);
export const useSubs = () => {
  const c = useContext(C);
  if (!c) throw new Error("SubsProvider missing");
  return c;
};

function readLS<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function strip(s: Subscription): SubscriptionInput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, ...rest } = s;
  return rest;
}

export function SubsProvider({ demo, children }: { demo: boolean; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode>(demo ? "demo" : "local");
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [localCount, setLocalCount] = useState(0);
  const [categories, setCats] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, []);

  const loadCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api("/api/subs");
      setSubs(d.subscriptions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    setCats(readLS(LS_CATS, [...DEFAULT_CATEGORIES]));
    setDismissed(readLS<string[]>(LS_DISMISSED, []).filter((k) => k.split("|")[1] >= todayISO()));
    const local = readLS<Subscription[]>(LS_SUBS, []);
    setLocalCount(local.length);
    if (demo) {
      setSubs(demoSubs());
      setReady(true);
      fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
      return;
    }
    setSubs(local);
    (async () => {
      try {
        const s: Status = await (await fetch("/api/status")).json();
        setStatus(s);
        if (s.user && localStorage.getItem(LS_CLOUD) === s.user.id) {
          setMode("cloud");
          await loadCloud();
        }
      } catch {
        // status endpoint unavailable → stay in local mode
      } finally {
        setReady(true);
      }
    })();
  }, [demo, loadCloud]);

  const saveLocal = (next: Subscription[]) => {
    setSubs(next);
    if (mode === "local") {
      localStorage.setItem(LS_SUBS, JSON.stringify(next));
      setLocalCount(next.length);
    }
  };

  const wrap = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    }
  };

  const add = (i: SubscriptionInput) =>
    wrap(async () => {
      if (mode === "cloud") setSubs((await api("/api/subs", { method: "POST", body: JSON.stringify(i) })).subscriptions);
      else saveLocal([...subs, { ...i, id: newId(), createdAt: new Date().toISOString() }]);
    });
  const addMany = (items: SubscriptionInput[]) =>
    wrap(async () => {
      if (mode === "cloud") setSubs((await api("/api/subs", { method: "POST", body: JSON.stringify({ items }) })).subscriptions);
      else saveLocal([...subs, ...items.map((i) => ({ ...i, id: newId(), createdAt: new Date().toISOString() }))]);
    });
  const update = (id: string, i: SubscriptionInput) =>
    wrap(async () => {
      if (mode === "cloud") setSubs((await api(`/api/subs/${id}`, { method: "PUT", body: JSON.stringify(i) })).subscriptions);
      else saveLocal(subs.map((s) => (s.id === id ? { ...s, ...i } : s)));
    });
  const patch = (id: string, p: Partial<SubscriptionInput>) => {
    const s = subs.find((x) => x.id === id);
    if (!s) return Promise.resolve();
    return update(id, { ...strip(s), ...p });
  };
  const remove = (id: string) =>
    wrap(async () => {
      if (mode === "cloud") setSubs((await api(`/api/subs/${id}`, { method: "DELETE" })).subscriptions);
      else saveLocal(subs.filter((s) => s.id !== id));
    });

  const enableCloud = async (importLocal: boolean) => {
    if (!status?.user) return;
    const local = readLS<Subscription[]>(LS_SUBS, []);
    await wrap(async () => {
      if (importLocal && local.length) {
        const d = await api("/api/subs", { method: "POST", body: JSON.stringify({ items: local.map(strip) }) });
        toast.success(`Imported ${d.imported} subscription${d.imported === 1 ? "" : "s"} to your account. Your local copy is unchanged.`);
      }
      localStorage.setItem(LS_CLOUD, status.user!.id);
      setMode("cloud");
      await loadCloud();
    });
  };
  const disableCloud = () => {
    localStorage.removeItem(LS_CLOUD);
    setMode("local");
    setSubs(readLS(LS_SUBS, []));
  };

  const setCategories = (c: string[]) => {
    setCats(c);
    localStorage.setItem(LS_CATS, JSON.stringify(c));
  };
  const dismiss = (key: string) => {
    const next = [...dismissed, key];
    setDismissed(next);
    localStorage.setItem(LS_DISMISSED, JSON.stringify(next));
  };

  const value = useMemo<Ctx>(
    () => ({ ready, loading, error, status, mode, subs, localCount, categories, setCategories, add, addMany, update, remove, patch, enableCloud, disableCloud, dismissed, dismiss, reload: mode === "cloud" ? loadCloud : async () => {} }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, loading, error, status, mode, subs, localCount, categories, dismissed],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
