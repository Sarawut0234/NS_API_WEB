# Shared Master Key System Guide

## Overview

The **Shared Master Key System** allows you to create a single script with one Master API Key that can be shared by multiple customers. Each customer can independently lock the key to their own IP address without needing separate keys.

### How It Works

1. **Admin Creates Master Key**: You create a product with a single Master License Key (e.g., `MASTER_KEY_ABC123`)
2. **Customers Purchase**: When customers buy the product, they automatically get the same Master Key
3. **Individual IP Lock**: Each customer can set their own IP address to lock the key to their server
4. **Independent Usage**: Even though they share the same key, each customer's IP lock is separate and independent

## Database Structure

The system uses these key fields in the `licenses` table:

- `license_key`: The Master Key (shared by all users)
- `user_id`: The customer who owns this license record
- `product_id`: The product they purchased
- `locked_ip`: Their individual IP address(es) - can be multiple IPs separated by commas
- `is_shared_key`: Flag indicating this is a shared master key (optional)
- `master_key_id`: Reference to the master license record (optional)

### Example

```
licenses table:
┌────┬─────────────────────────┬─────────┬────────────┬────────────────────┐
│ id │ license_key             │ user_id │ product_id │ locked_ip          │
├────┼─────────────────────────┼─────────┼────────────┼────────────────────┤
│ 1  │ MASTER_KEY_ABC123       │ NULL    │ 5          │ 0.0.0.0            │ ← Master record
│ 2  │ MASTER_KEY_ABC123       │ 10      │ 5          │ 192.168.1.100      │ ← User 10's lock
│ 3  │ MASTER_KEY_ABC123       │ 15      │ 5          │ 10.0.0.1, 10.0.0.2 │ ← User 15's lock
│ 4  │ MASTER_KEY_ABC123       │ 20      │ 5          │ 0.0.0.0            │ ← User 20 (no lock)
└────┴─────────────────────────┴─────────┴────────────┴────────────────────┘
```

## API Endpoints

### 1. Verify License with Shared Key (New)

**Endpoint**: `POST /api/license/verify-shared`

**Purpose**: Verify a license key for a specific user with their IP lock

**Request Body**:
```json
{
  "license_key": "MASTER_KEY_ABC123",
  "user_id": 10,
  "product_id": 5
}
```

**Response (Success)**:
```json
{
  "status": true,
  "message": "License verified",
  "allowed_ip": "192.168.1.100"
}
```

**Response (IP Mismatch)**:
```json
{
  "status": false,
  "message": "IP mismatch",
  "allowed_ip": "192.168.1.100"
}
```

### 2. Update IP for Shared Key

**Endpoint**: `POST /api/license/update-ip`

**Purpose**: Customer updates their IP lock for their shared key

**Request Body**:
```json
{
  "productId": 5,
  "ip": "192.168.1.100"
}
```

**Note**: The system automatically identifies the user from their session and updates their specific IP lock.

## Setup Instructions

### Step 1: Run Migration

Execute the migration SQL to update your database:

```sql
-- File: sql/migration_shared_master_key.sql
-- This adds support for shared keys with multiple users per key
```

### Step 2: Create a Product with Master Key

1. Go to Admin Dashboard
2. Create a new product
3. Set the `license_key` field to your Master Key (e.g., `MASTER_KEY_ABC123`)
4. Mark it as a shared key if desired

### Step 3: Customers Purchase and Set IP

1. Customer purchases the product
2. Customer goes to "Purchase History" in their dashboard
3. Customer enters their server IP address (or multiple IPs separated by commas)
4. System automatically creates a license record with their IP lock

## FiveM Script Integration

### Example Lua Code

```lua
-- FiveM Script using Shared Master Key

local MASTER_KEY = "MASTER_KEY_ABC123"
local PRODUCT_ID = 5
local API_URL = "http://185.84.160.45:3000"

-- Get user ID from Discord (or your auth system)
local USER_ID = GetPlayerIdentifier(source, 0):gsub("discord:", "")

function VerifyLicense()
    local payload = json.encode({
        license_key = MASTER_KEY,
        user_id = tonumber(USER_ID),
        product_id = PRODUCT_ID
    })
    
    PerformHttpRequest(
        API_URL .. "/api/license/verify-shared",
        function(statusCode, response, headers)
            local data = json.decode(response)
            
            if statusCode == 200 and data.status then
                print("^2License verified!^7")
                -- Script is authorized, proceed
            else
                print("^1License verification failed: " .. (data.message or "Unknown error") .. "^7")
                -- Deny access
            end
        end,
        "POST",
        payload,
        { ["Content-Type"] = "application/json" }
    )
end

-- Call on script start
VerifyLicense()
```

## Customer Experience

### For Customers

1. **Purchase**: Buy the product once
2. **Download**: Get the script with the Master Key embedded
3. **Set IP**: Go to dashboard and enter their server IP (can be multiple)
4. **Use**: Script runs and automatically verifies with their IP lock
5. **Change IP**: If they move servers, they just update their IP in the dashboard

### Benefits

- ✅ Single key for all their servers
- ✅ Easy IP management from dashboard
- ✅ No need to contact admin for new keys
- ✅ Multiple IPs supported per key
- ✅ Instant IP changes without script restart

## Admin Management

### View All Users of a Master Key

Use the Admin Licenses page to see all users sharing a Master Key and their individual IP locks.

### Disable a User's Access

1. Go to Admin Licenses
2. Find the user's license record
3. Toggle "Active" to disable/enable

### Reset a User's IP

1. Go to Admin Licenses
2. Edit the user's record
3. Clear or change the IP address

## Security Considerations

- Each user's IP lock is independent and cannot be seen by other users
- The Master Key is embedded in the script, so treat it like a product license
- IP locks prevent unauthorized usage from different servers
- Multiple IPs per key allows for legitimate multi-server setups

## Troubleshooting

### "User does not own this product"
- The user_id doesn't match a purchase of this product
- Check that the user actually purchased the product

### "IP mismatch"
- The server's IP doesn't match the locked IP
- Customer needs to update their IP in the dashboard
- Verify the IP is being sent correctly from the script

### "License not found"
- The license_key doesn't match any record for this user
- Check that the Master Key is correct
- Ensure the product_id is correct

## Migration Path

If you have existing individual keys, you can:

1. Create a new Master Key for the product
2. Migrate existing customers to the new shared key system
3. Optionally keep old keys working during transition period
