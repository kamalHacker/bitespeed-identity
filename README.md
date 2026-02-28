# Bitespeed Identity Reconciliation

A REST API service to identify and consolidate customer identity across multiple purchases.

## Endpoint
`POST /identify`

## Request Body
```json
{
  "email": "example@example.com",
  "phoneNumber": "123456"
}
```
> At least one of `email` or `phoneNumber` is required.

## Response
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [2]
  }
}
```

### Response Fields
- `primaryContatctId` — ID of the oldest/primary contact
- `emails` — all emails linked to this identity, primary's email is always first
- `phoneNumbers` — all phone numbers linked, primary's phone is always first
- `secondaryContactIds` — IDs of all secondary contacts linked to the primary

## Live URL
Base URL: `https://bitespeed-identity-ten.vercel.app`

## API Endpoint
`POST https://bitespeed-identity-ten.vercel.app/identify`