# API-KEY-LOCK-IP System Guide

## Overview

This NS_System now includes a built-in **API-KEY-LOCK-IP** system designed for FiveM script licensing and IP locking. This system allows you to:

- Assign unique license keys to each user per product
- Lock each license to a specific IP address
- Verify licenses with IP validation
- Allow users to update their locked IP addresses
- Support both user-specific and legacy verification modes

## Database Schema

### New Licenses Table Structure

The `licenses` table has been updated to support per-user IP locking:

```sql
CREATE TABLE `licenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `license_key` varchar(255) NOT NULL,
  `allowed_ip` varchar(45) NOT NULL,
  `script_name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_product_script` (`user_id`, `product_id`, `script_name`),
  KEY `idx_license_key` (`license_key`),
  KEY `idx_script_name` (`script_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Key Changes

- **user_id**: Identifies which user owns the license
- **product_id**: Links to the product being licensed
- **license_key**: The unique license key for the product
- **allowed_ip**: The IP address locked to this license
- **script_name**: The name of the script (derived from product slug or name)
- **UNIQUE constraint**: Ensures one license per user per product per script

## API Endpoints

### 1. License Verification Endpoint

**Endpoint**: `GET /api/license/verify`

**Parameters**:
- `license_key` (required): The license key to verify
- `script_name` (required): The name of the script
- `ip` (required for IP lock check): The IP address to verify
- `user_id` (optional): User ID for user-specific verification
- `product_id` (optional): Product ID for user-specific verification

**Example Request** (User-Specific IP Lock):
```
GET /api/license/verify?license_key=ABC123&script_name=nap-garage&ip=192.168.1.100&user_id=5&product_id=1
```

**Example Request** (Legacy Verification):
```
GET /api/license/verify?license_key=ABC123&script_name=nap-garage&ip=192.168.1.100
```

**Response** (Success):
```json
{
  "ok": true,
  "valid": true,
  "allowedIp": "192.168.1.100"
}
```

**Response** (IP Mismatch):
```json
{
  "ok": false,
  "valid": false,
  "reason": "ip_mismatch",
  "allowedIp": "192.168.1.50"
}
```

### 2. Update IP Address Endpoint

**Endpoint**: `POST /api/license/update-ip`

**Authentication**: Required (user must be logged in)

**Request Body**:
```json
{
  "productId": 1,
  "ip": "192.168.1.200"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "data": {
    "licenseKey": "ABC123",
    "scriptName": "nap-garage",
    "allowedIp": "192.168.1.200"
  }
}
```

**Response** (Error):
```json
{
  "ok": false,
  "error": "Invalid IP format."
}
```

### 3. Purchase History / IP Management Page

**URL**: `/dashboard/purchase-history`

Users can view their purchased products and update the locked IP address for each product directly from the dashboard.

## How It Works

### License Assignment Flow

1. **User purchases a product** → License record is created in the `licenses` table
2. **Default IP is set** → Initially set to `0.0.0.0` (any IP allowed)
3. **User updates IP** → User can change the locked IP via the dashboard or API
4. **Script verification** → When the script runs, it calls the verification API with the user's IP

### Verification Flow

1. **Script sends request**: `GET /api/license/verify?license_key=...&script_name=...&ip=...&user_id=...&product_id=...`
2. **System checks**:
   - If `user_id` and `product_id` provided → Check user-specific license
   - Otherwise → Check legacy license (backward compatible)
3. **IP validation**:
   - If `allowed_ip` is `0.0.0.0` → Any IP is allowed
   - If `allowed_ip` matches request IP → License is valid
   - If `allowed_ip` doesn't match → Return `ip_mismatch` error

## Migration

To update your existing database to support the new schema:

1. **Run the migration SQL**:
   ```bash
   mysql -u root -p ns_system < sql/migration_licenses_user_lock.sql
   ```

2. **Or manually execute** the migration in phpMyAdmin

3. **Verify** the new table structure:
   ```sql
   DESCRIBE licenses;
   ```

## FiveM Script Integration Example

Here's an example of how to integrate this with a FiveM script:

```lua
-- FiveM Script Example
local LICENSE_KEY = "YOUR_LICENSE_KEY"
local SCRIPT_NAME = "nap-garage"
local API_URL = "http://185.84.160.45:3000/api/license/verify"
local USER_ID = 5  -- Get from user account
local PRODUCT_ID = 1  -- Get from product

-- Get server IP
local function getServerIp()
    -- Implementation depends on your server setup
    return GetConvar("sv_ip", "127.0.0.1")
end

-- Verify license
local function verifyLicense()
    local ip = getServerIp()
    local url = string.format(
        "%s?license_key=%s&script_name=%s&ip=%s&user_id=%s&product_id=%s",
        API_URL, LICENSE_KEY, SCRIPT_NAME, ip, USER_ID, PRODUCT_ID
    )
    
    PerformHttpRequest(url, function(errorCode, resultData, resultHeaders)
        if errorCode == 200 then
            local response = json.decode(resultData)
            if response.ok and response.valid then
                print("^2License verified!^7")
            else
                print("^1License verification failed: " .. (response.reason or "unknown") .. "^7")
            end
        else
            print("^1API request failed: " .. errorCode .. "^7")
        end
    end, "GET")
end

-- Call on script start
verifyLicense()
```

## Admin Features

### Managing Licenses

Admin users can:

1. **View all licenses** in the admin panel
2. **Reset user IP** if needed
3. **View license history** and changes
4. **Monitor IP lock violations**

### Admin Endpoints (Future)

The following endpoints can be added for admin management:

- `GET /api/admin/licenses` - List all licenses
- `POST /api/admin/licenses/[id]/reset-ip` - Reset a license IP
- `GET /api/admin/licenses/[id]/history` - View IP change history

## Security Considerations

1. **Rate Limiting**: IP update requests are rate-limited to prevent abuse
2. **User Ownership**: Users can only update IPs for products they own
3. **IP Validation**: All IP addresses are validated before storage
4. **HTTPS**: Always use HTTPS in production for API calls
5. **API Key**: Consider adding an API key authentication layer for script verification

## Troubleshooting

### License Not Found
- Ensure the user has purchased the product
- Check that the license key matches the product configuration
- Verify the script_name is correct

### IP Mismatch Error
- The script is running from a different IP than the one registered
- User needs to update the IP in the dashboard
- Check if the server IP is dynamic and needs updating

### Database Migration Issues
- Backup your existing licenses data before running migration
- If you have existing data, manually migrate it using the commented SQL in the migration file
- Check database permissions and character set compatibility

## Future Enhancements

Potential improvements to the API-KEY-LOCK-IP system:

1. **Multi-IP Support**: Allow multiple IPs per license
2. **IP Whitelist**: Support IP ranges or CIDR notation
3. **License Expiration**: Add expiration dates to licenses
4. **Usage Analytics**: Track license usage and IP changes
5. **Webhook Notifications**: Notify on IP changes or verification failures
6. **License Sharing**: Allow temporary license sharing with rate limiting

## Support

For issues or questions about the API-KEY-LOCK-IP system:

1. Check this guide for common solutions
2. Review the API endpoint documentation
3. Check the database schema and ensure migrations are applied
4. Review server logs for error messages

---

**Last Updated**: June 2026
**Version**: 1.0
