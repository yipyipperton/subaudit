export type CatalogEntry = {
  slug: string;
  name: string;
  category: string;
  url: string;
  steps: string[];
  match: string[]; // lowercase substrings used for matching statement text / names
};

// Links point to each provider's own account/subscription page or official help article.
// Providers change these pages; if a link breaks, the steps still describe where to look.
export const CATALOG: CatalogEntry[] = [
  { slug: "netflix", name: "Netflix", category: "Streaming", url: "https://www.netflix.com/cancelplan", steps: ["Sign in on the web.", "Open the cancel page (or Account → Cancel Membership).", "Confirm Finish Cancellation. Access continues to the end of the billing period."], match: ["netflix"] },
  { slug: "spotify", name: "Spotify", category: "Streaming", url: "https://www.spotify.com/account/subscription/", steps: ["Sign in at spotify.com (not the app).", "Account → Manage your plan → Cancel subscription.", "If billed via Apple/Google or a carrier, cancel there instead."], match: ["spotify"] },
  { slug: "disney-plus", name: "Disney+", category: "Streaming", url: "https://www.disneyplus.com/account/subscription", steps: ["Sign in on a web browser.", "Profile → Account → select your subscription.", "Choose Cancel Subscription and confirm."], match: ["disney+", "disney plus", "disneyplus"] },
  { slug: "hulu", name: "Hulu", category: "Streaming", url: "https://secure.hulu.com/account", steps: ["Sign in to your Hulu Account page.", "Under Your Subscription, select Cancel.", "Skip the offers and confirm. Billed via a partner? Cancel with that partner."], match: ["hulu"] },
  { slug: "max", name: "HBO Max", category: "Streaming", url: "https://www.hbomax.com/", steps: ["Sign in on the web, open your profile → Subscription.", "Choose Manage Subscription → Cancel Subscription.", "If billed through Apple, Google, Amazon or a cable provider, cancel there."], match: ["hbo max", "hbomax", "max.com", " max "] },
  { slug: "youtube-premium", name: "YouTube Premium", category: "Streaming", url: "https://www.youtube.com/paid_memberships", steps: ["Open Purchases and memberships.", "Select Premium → Deactivate / Continue to cancel.", "Confirm cancellation."], match: ["youtube premium", "youtube music", "youtubepremium", "google youtube"] },
  { slug: "paramount-plus", name: "Paramount+", category: "Streaming", url: "https://www.paramountplus.com/account/", steps: ["Sign in, open Account.", "Select Cancel Subscription and confirm."], match: ["paramount"] },
  { slug: "peacock", name: "Peacock", category: "Streaming", url: "https://www.peacocktv.com/account/plans", steps: ["Sign in, go to Account → Plans & Payment.", "Choose Change Plan → Cancel Plan."], match: ["peacock"] },
  { slug: "crunchyroll", name: "Crunchyroll", category: "Streaming", url: "https://www.crunchyroll.com/account/membership", steps: ["Sign in, open Account → Membership.", "Select Cancel Membership."], match: ["crunchyroll"] },
  { slug: "apple", name: "Apple (App Store, iCloud+, Apple TV+, Music)", category: "Software", url: "https://support.apple.com/en-us/118428", steps: ["iPhone: Settings → your name → Subscriptions.", "Pick the subscription → Cancel Subscription.", "Mac/PC/web steps are in Apple's article linked here."], match: ["apple.com/bill", "apple.com", "itunes", "icloud", "apple tv", "apple music", "apple one"] },
  { slug: "amazon-prime", name: "Amazon Prime", category: "Other", url: "https://www.amazon.com/gp/primecentral", steps: ["Open Prime membership settings.", "Manage membership → End membership.", "Walk through the confirmation pages until it says ended."], match: ["amazon prime", "prime video", "amzn prime", "amazon.com prime", "prime membership"] },
  { slug: "audible", name: "Audible", category: "Other", url: "https://www.audible.com/account/overview", steps: ["Sign in on the web (not the app).", "Account Details → Cancel membership.", "Use remaining credits first — they expire on cancellation."], match: ["audible"] },
  { slug: "adobe", name: "Adobe Creative Cloud", category: "Software", url: "https://account.adobe.com/plans", steps: ["Sign in to your Adobe account → Plans.", "Manage plan → Cancel your plan.", "Annual plans billed monthly may carry an early-termination fee — Adobe shows it before you confirm."], match: ["adobe"] },
  { slug: "microsoft-365", name: "Microsoft 365 / Xbox Game Pass", category: "Software", url: "https://account.microsoft.com/services", steps: ["Sign in to Services & subscriptions.", "Find the subscription → Manage → Cancel subscription (or turn off recurring billing)."], match: ["microsoft", "msft", "office 365", "xbox", "game pass"] },
  { slug: "dropbox", name: "Dropbox", category: "Cloud", url: "https://www.dropbox.com/account/plan", steps: ["Sign in on the web → Settings → Plan.", "Select Cancel plan and confirm.", "Make sure your files fit the free quota first."], match: ["dropbox"] },
  { slug: "google-one", name: "Google One", category: "Cloud", url: "https://one.google.com/settings", steps: ["Open Google One settings.", "Cancel membership and confirm.", "Storage above the free tier becomes read-only for new uploads."], match: ["google one", "google storage", "googleone"] },
  { slug: "chatgpt", name: "ChatGPT Plus / Pro", category: "Software", url: "https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription", steps: ["On chatgpt.com: profile → Settings → Account / Subscription → Manage.", "Choose Cancel plan.", "Subscribed in the iOS/Android app? Cancel through the app store."], match: ["chatgpt", "openai"] },
  { slug: "github", name: "GitHub (Copilot / Pro)", category: "Software", url: "https://github.com/settings/billing/summary", steps: ["Settings → Billing and plans.", "Cancel or downgrade the plan / Copilot subscription."], match: ["github"] },
  { slug: "canva", name: "Canva Pro", category: "Software", url: "https://www.canva.com/settings/billing-and-teams", steps: ["Settings → Billing & plans.", "Select the plan → Cancel subscription."], match: ["canva"] },
  { slug: "peloton", name: "Peloton", category: "Fitness", url: "https://members.onepeloton.com/preferences", steps: ["Sign in on the web → Preferences → Subscriptions (or Membership).", "Choose the membership → Cancel subscription."], match: ["peloton"] },
  { slug: "nyt", name: "The New York Times", category: "News", url: "https://myaccount.nytimes.com/seg/subscription", steps: ["Sign in → Account → Subscription overview.", "Select Cancel subscription (some regions route you to chat or phone)."], match: ["nytimes", "new york times", "nyt"] },
  { slug: "wsj", name: "The Wall Street Journal", category: "News", url: "https://customercenter.wsj.com/", steps: ["Open the Customer Center and sign in.", "Subscriptions → Cancel subscription (may require chat or phone)."], match: ["wsj", "wall street journal", "dow jones"] },
];

export const GENERIC_STEPS = [
  "Look in the provider's website under Account, Billing, Plan or Subscription.",
  "If you subscribed through Apple, Google Play, Amazon, PayPal or a phone carrier, cancel there — the provider can't see that billing.",
  "Save the confirmation email or screenshot; note the date access ends.",
  "If there's no self-serve option, contact support in writing and keep a copy. Your bank can block future charges from a merchant if a cancellation is ignored.",
];

export function findCatalog(name: string): CatalogEntry | undefined {
  const n = ` ${name.toLowerCase()} `;
  return CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase().trim()) ?? CATALOG.find((c) => c.match.some((m) => n.includes(m)));
}
