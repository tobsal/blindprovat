// Utan databasadapter slumpar Auth.js ett nytt user.id vid varje inloggning.
// Kontots id hos providern är det enda som består, så det blir ägar-id:t.
// Ligger för sig själv så att den går att testa utan att ladda next-auth.
export function ownerIdFromAccount(account: {
  provider: string;
  providerAccountId: string;
}): string {
  return `${account.provider}:${account.providerAccountId}`;
}
