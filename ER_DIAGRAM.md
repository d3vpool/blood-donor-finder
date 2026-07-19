# LifeLink — Entity Relationship Diagram

> **Database:** Cloud Firestore (NoSQL document store)
> All collections use the authenticated user's `uid` (from Firebase Auth) as the document ID where noted.

---

## Collections Overview

| Collection | Document ID | Description |
|---|---|---|
| `Users` | `uid` | Basic profile created at signup |
| `Donors` | `uid` | Donor registration profile |
| `UserTokens` | `uid` | FCM push notification tokens |
| `BloodRequests` | Auto-generated | Emergency blood requests |

---

## ER Diagram (Mermaid)

```mermaid
erDiagram

    FIREBASE_AUTH {
        string uid PK
        string email
        string password
    }

    USERS {
        string uid PK "== Firebase Auth UID"
        string email
        string fullname
        string createdAt
    }

    DONORS {
        string uid PK "== Firebase Auth UID"
        string fullname
        string email
        string phoneNo
        string bloodType "A+, A-, B+, B-, AB+, AB-, O+, O-"
        string address
        object location "{ latitude, longitude }"
        string geoHash "Geohash for geo-queries"
        string registeredAt
        number snoozedUntil "null | epoch ms — snooze window"
    }

    USER_TOKENS {
        string uid PK "== Firebase Auth UID"
        array fcmTokens "string[] — FCM device tokens"
    }

    BLOOD_REQUESTS {
        string id PK "Auto-generated"
        string userId FK "→ Firebase Auth UID"
        string patientName
        string bloodType "A+, A-, B+, B-, AB+, AB-, O+, O-"
        string urgency "Critical | Urgent | Standard"
        string hospitalName
        string hospitalAddress
        object location "{ latitude, longitude }"
        string geoHash "Geohash for geo-queries"
        string contactPhone
        string status "pending | fulfilled | cancelled"
        string requestedAt "ISO timestamp"
        string acceptedBy "null | donor uid"
        array nearByDonors "Injected by Cloud Function"
    }

    FIREBASE_AUTH ||--o| USERS        : "creates on signup (uid)"
    FIREBASE_AUTH ||--o| DONORS       : "creates on registration (uid)"
    FIREBASE_AUTH ||--o| USER_TOKENS  : "linked by uid"
    FIREBASE_AUTH ||--o{ BLOOD_REQUESTS : "submits (userId)"

    DONORS        }o--|| USER_TOKENS  : "receives FCM tokens via uid"
    BLOOD_REQUESTS }o--|| DONORS      : "nearByDonors[] references donor docs"
```

---

## Collection Field Details

### `Users/{uid}`
| Field | Type | Notes |
|---|---|---|
| `uid` | `string` | Document ID = Firebase Auth UID |
| `email` | `string` | From Firebase Auth |
| `fullname` | `string` | Entered at signup |
| `createdAt` | `string` | ISO timestamp |

---

### `Donors/{uid}`
| Field | Type | Notes |
|---|---|---|
| `uid` | `string` | Document ID = Firebase Auth UID |
| `fullname` | `string` | Donor's full name |
| `email` | `string` | From Firebase Auth |
| `phoneNo` | `string` | Contact number |
| `bloodType` | `string` | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `address` | `string` | Home/area address |
| `location` | `map` | `{ latitude: number, longitude: number }` |
| `geoHash` | `string` | Geohash of location for geo-range queries |
| `registeredAt` | `string` | ISO timestamp of registration |
| `snoozedUntil` | `number \| null` | Epoch ms; donor hidden from searches until this time |

---

### `UserTokens/{uid}`
| Field | Type | Notes |
|---|---|---|
| `uid` | `string` | Document ID = Firebase Auth UID |
| `fcmTokens` | `string[]` | Array of FCM device tokens (supports multiple devices) |

---

### `BloodRequests/{autoId}`
| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Auto-generated document ID |
| `userId` | `string` | FK → Firebase Auth UID of requester |
| `patientName` | `string` | Name of the patient |
| `bloodType` | `string` | Blood group needed |
| `urgency` | `string` | `Critical`, `Urgent`, or `Standard` |
| `hospitalName` | `string` | Hospital / facility name |
| `hospitalAddress` | `string` | Full hospital address |
| `location` | `map` | `{ latitude: number, longitude: number }` |
| `geoHash` | `string` | Geohash for geo-range queries |
| `contactPhone` | `string` | Emergency contact number |
| `status` | `string` | `pending` → `fulfilled` or `cancelled` |
| `requestedAt` | `string` | ISO timestamp |
| `acceptedBy` | `string \| null` | UID of donor who accepted (future use) |
| `nearByDonors` | `Donor[]` | Array injected by `bloodRequestReceived` Cloud Function |

---

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Auth as Firebase Auth
    participant FS as Firestore
    participant CF as Cloud Function
    participant FCM as Firebase Cloud Messaging

    Note over User,Auth: Sign Up
    User->>Auth: createUserWithEmailAndPassword()
    Auth-->>User: uid
    User->>FS: setDoc(Users/{uid}, { email, fullname, createdAt })

    Note over User,FS: Donor Registration
    User->>FS: setDoc(Donors/{uid}, { bloodType, location, geoHash, ... })
    User->>FCM: requestPermission() → getToken()
    User->>FS: setDoc(UserTokens/{uid}, { fcmTokens: [token] })

    Note over User,CF: Emergency Blood Request
    User->>FS: addDoc(BloodRequests, { bloodType, location, geoHash, status: pending, ... })
    FS->>CF: onDocumentCreated trigger fires
    CF->>FS: Query Donors by bloodType + geoHash range (10 km)
    CF->>FS: Query UserTokens for each nearby donor
    CF->>FS: Update BloodRequests/{id} with nearByDonors[]
    CF->>FCM: sendEachForMulticast(tokens, notification)
    FCM-->>User: Push notification to nearby donors
```

---

## Relationships Summary

```
Firebase Auth (uid)
  │
  ├──[1:1]──▶  Users/{uid}          (profile data)
  │
  ├──[1:1]──▶  Donors/{uid}         (donor registration + geo location)
  │              │
  │              └──[1:1]──▶  UserTokens/{uid}   (FCM push tokens)
  │
  └──[1:N]──▶  BloodRequests/{autoId}  (emergency requests)
                 │
                 └──[N:N via array]──▶ nearByDonors[]  (computed by Cloud Function,
                                                         references Donor documents)
```

> **Note:** Firestore is a NoSQL document store — there are no enforced foreign keys. Relationships are maintained by convention (shared `uid`) and enforced through Firestore Security Rules.
