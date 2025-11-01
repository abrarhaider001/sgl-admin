# Firebase Database Schema Documentation
## Updated to match reference schema structure

This document outlines the complete database schema for the Admin Panel application, designed for Firebase Firestore.

## Collections Overview

The database consists of the following main collections:
- `albums` - Card album collections
- `banners` - Marketing banners and promotional content
- `cards` - Individual trading cards
- `redeemCodes` - QR codes for card redemption
- `packs` - Card packs for purchase
- `users` - User accounts and profiles
  - `cardsOwned` (subcollection) - Cards owned by each user

---

## Collection Schemas

### 1. Albums Collection
**Collection Name:** `albums`

```json
{
  "albumId": "string",     // Unique album identifier
  "cardIds": ["string"],   // Array of card IDs in this album
  "image": "string",       // Album cover image URL
  "name": "string"         // Album name
}
```

**Example Document:**
```json
{
  "albumId": "album_001",
  "cardIds": ["card_001", "card_002", "card_003"],
  "image": "https://example.com/album-cover.jpg",
  "name": "Monster Collection"
}
```

### 2. Banners Collection
**Collection Name:** `banners`

```json
{
  "bannerId": "string",    // Unique banner identifier
  "image": "string",       // Banner image URL
  "url": "string"          // URL that banner links to
}
```

**Example Document:**
```json
{
  "bannerId": "banner_001",
  "image": "https://example.com/banner.jpg",
  "url": "https://example.com/promotion"
}
```

### 3. Cards Collection
**Collection Name:** `cards`

```json
{
  "cardId": "string",      // Unique card identifier
  "description": "string", // Card description
  "image": "string",       // Card image URL
  "name": "string",        // Card name
  "points": "number"       // Card point value
}
```

**Example Document:**
```json
{
  "cardId": "card_001",
  "description": "A powerful dragon card with fire abilities",
  "image": "https://example.com/dragon-card.jpg",
  "name": "Fire Dragon",
  "points": 150
}
```

### 4. Redeem Codes Collection
**Collection Name:** `redeemCodes`

```json
{
  "codeId": "string",      // Unique code identifier
  "qrCode": "string",      // QR code data/URL
  "cardId": "string"       // ID of the card this code redeems
}
```

**Example Document:**
```json
{
  "codeId": "code_001",
  "qrCode": "https://example.com/qr/code_001",
  "cardId": "card_001"
}
```

### 5. Packs Collection
**Collection Name:** `packs`

```json
{
  "description": "string", // Pack description
  "image": "string",       // Pack image URL
  "isFeatured": "boolean", // Whether pack is featured
  "name": "string",        // Pack name
  "packId": "string",      // Unique pack identifier
  "price": "number",       // Pack price
  "rarity": "string",      // Pack rarity level
  "stockNo": "string"      // Stock number reference
}
```

**Example Document:**
```json
{
  "description": "Premium pack containing rare cards",
  "image": "https://example.com/premium-pack.jpg",
  "isFeatured": true,
  "name": "Premium Dragon Pack",
  "packId": "pack_001",
  "price": 29.99,
  "rarity": "legendary",
  "stockNo": "STK001"
}
```

### 6. Users Collection
**Collection Name:** `users`

```json
{
  "city": "string",              // User's city
  "country": "string",           // User's country
  "dateOfBirth": "string",       // Date of birth (ISO string or timestamp)
  "email": "string",             // User's email address
  "firstName": "string",         // User's first name
  "gender": "string",            // User's gender
  "id": "string",                // Unique user identifier
  "language": "string",          // User's preferred language
  "lastName": "string",          // User's last name
  "name": "string",              // User's full name
  "profileImagePath": "string",  // Path to profile image
  "points": "number",            // User's points balance
  "state": "string"              // User's state/province
}
```

**Example Document:**
```json
{
  "city": "New York",
  "country": "USA",
  "dateOfBirth": "1990-01-15",
  "email": "john.doe@example.com",
  "firstName": "John",
  "gender": "male",
  "id": "user_001",
  "language": "en",
  "lastName": "Doe",
  "name": "John Doe",
  "profileImagePath": "/profiles/user_001.jpg",
  "points": 1250,
  "state": "NY"
}
```

### 6.1. User Cards Owned Subcollection
**Subcollection Path:** `users/{userId}/cardsOwned`

```json
{
  "cardId": "string",      // ID of the owned card
  "quantity": "number",    // Number of this card owned
  "timestamp": "string"    // When the card was acquired (ISO string or timestamp)
}
```

**Example Document:**
```json
{
  "cardId": "card_001",
  "quantity": 2,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Data Relationships

### Album-Card Relationship
- Albums contain an array of `cardIds` that reference documents in the `cards` collection
- This creates a many-to-many relationship where cards can belong to multiple albums

### User-Card Ownership
- User card ownership is tracked in the `cardsOwned` subcollection under each user
- Each document represents a specific card owned by the user with quantity and acquisition timestamp

### Redeem Code-Card Relationship
- Each redeem code is linked to a specific card via `cardId`
- This creates a one-to-one relationship between codes and cards

### Pack-Stock Relationship
- Packs reference stock numbers via the `stockNo` field
- This allows for inventory tracking and management

---

## Indexes for Query Optimization

### Recommended Composite Indexes

1. **Albums by name (ascending)**
   - Collection: `albums`
   - Fields: `name` (Ascending)

2. **Cards by points (descending)**
   - Collection: `cards`
   - Fields: `points` (Descending)

3. **Packs by featured status and price**
   - Collection: `packs`
   - Fields: `isFeatured` (Descending), `price` (Ascending)

4. **Users by country and points**
   - Collection: `users`
   - Fields: `country` (Ascending), `points` (Descending)

5. **User cards owned by timestamp**
   - Collection: `users/{userId}/cardsOwned`
   - Fields: `timestamp` (Descending)

---

## Security Rules

### Basic Security Rules Structure
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Albums - Read access for all, write for authenticated users
    match /albums/{albumId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Banners - Read access for all, write for admins only
    match /banners/{bannerId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true;
    }
    
    // Cards - Read access for all, write for authenticated users
    match /cards/{cardId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Redeem Codes - Read/write for authenticated users only
    match /redeemCodes/{codeId} {
      allow read, write: if request.auth != null;
    }
    
    // Packs - Read access for all, write for authenticated users
    match /packs/{packId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Users - Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId;
      
      // Cards owned subcollection
      match /cardsOwned/{cardOwnedId} {
        allow read, write: if request.auth != null && 
                              request.auth.uid == userId;
      }
    }
  }
}
```

---

## Best Practices Implementation

### 1. Document ID Conventions
- Use descriptive prefixes: `album_`, `card_`, `user_`, `pack_`, etc.
- Maintain consistent ID formats across collections
- Use UUIDs or auto-generated IDs for uniqueness

### 2. Data Validation
- Implement client-side validation using TypeScript interfaces
- Use Firestore security rules for server-side validation
- Validate required fields and data types

### 3. Query Optimization
- Create appropriate indexes for common query patterns
- Use pagination for large result sets
- Implement efficient filtering and sorting

### 4. Storage Considerations
- Store image URLs as strings, not binary data
- Use Firebase Storage for actual image files
- Implement proper image optimization and caching

---

## Migration Strategy

### From Previous Schema
1. **Albums**: Map `id` → `albumId`, remove deprecated fields
2. **Cards**: Simplify structure, remove `type`, `rarity`, `albumId` fields
3. **Users**: Change `id` from number to string, add new fields
4. **New Collections**: Create `banners`, `redeemCodes`, `packs` collections
5. **Subcollections**: Migrate `cardsOwned` array to subcollection structure

### Migration Steps
1. Create new collections with updated schema
2. Migrate existing data using batch operations
3. Update application code to use new schema
4. Test thoroughly before removing old collections
5. Update security rules and indexes

---

## Performance Considerations

### Read Optimization
- Use appropriate indexes for common queries
- Implement pagination for large datasets
- Cache frequently accessed data

### Write Optimization
- Use batch operations for multiple writes
- Implement proper error handling and retries
- Consider using transactions for related updates

### Storage Optimization
- Optimize image sizes and formats
- Use Firebase Storage for large files
- Implement proper caching strategies

---

This schema provides a solid foundation for the admin panel application while maintaining flexibility for future enhancements.