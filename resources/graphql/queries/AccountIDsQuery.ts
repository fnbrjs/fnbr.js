export default `
query AccountQuery($accountIds: [String]!) {
  Account {
    accounts(accountIds: $accountIds) {
      id
      displayName
      externalAuths {
        type
        accountId
        externalAuthId
        externalDisplayName
      }
    }
  }
}
`;
