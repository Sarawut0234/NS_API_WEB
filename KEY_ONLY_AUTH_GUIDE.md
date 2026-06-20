# Key-Only Authentication Guide (For Script Developers)

## Overview

This system allows you to protect your FiveM scripts using only a **License Key**. Your customers don't need to enter their User ID or Product ID in the script. They only need to set their server IP on your website.

### Workflow
1. **Developer**: Embeds the Master Key in the script.
2. **Customer**: Purchases the script and gets the Master Key.
3. **Customer**: Enters their server IP on your website dashboard.
4. **Script**: Automatically verifies the Key + Server IP and runs.

---

## 1. FiveM Script Integration (Lua)

Put this code in your **server-side** script.

```lua
-- server.lua

local LICENSE_KEY = "YOUR_MASTER_KEY_HERE" -- Your Master Key from Admin Panel
local API_URL = "http://185.84.160.45:3000"

function VerifyLicense()
    local payload = json.encode({
        license_key = LICENSE_KEY
    })

    print("^3[Auth] Checking license for key: " .. LICENSE_KEY .. "^7")

    PerformHttpRequest(API_URL .. "/api/license/verify-key-only", function(statusCode, response, headers)
        if statusCode == 200 then
            local data = json.decode(response)
            if data and data.status then
                print("^2[Auth] License Verified! Script Started.^7")
                -- Proceed with your script logic here
            else
                print("^1[Auth] License Invalid: " .. (data.message or "Unknown error") .. "^7")
                StopResource(GetCurrentResourceName())
            end
        elseif statusCode == 403 then
            print("^1[Auth] Access Denied: Your server IP is not authorized for this key.^7")
            print("^1[Auth] Please update your IP on the website dashboard.^7")
            StopResource(GetCurrentResourceName())
        else
            print("^1[Auth] Connection Error (Status: " .. statusCode .. ")^7")
            StopResource(GetCurrentResourceName())
        end
    end, "POST", payload, { ["Content-Type"] = "application/json" })
end

-- Run check on script start
CreateThread(function()
    VerifyLicense()
end)
```

---

## 2. Admin Setup

1. Go to your **Admin Dashboard**.
2. Go to **Products** and create/edit a product.
3. Set a **License Key** (e.g., `MY_AWESOME_SCRIPT_KEY`).
4. Ensure the script you distribute has this exact key in `LICENSE_KEY`.

---

## 3. Customer Setup

1. Customer buys the product.
2. Customer goes to **Purchase History** on your website.
3. Customer enters their **Server IP** (e.g., `103.xxx.xxx.xxx`).
4. Customer restarts their FiveM server.
5. The script will now work!

---

## Why this is better:
- ✅ **User Friendly**: Customer only deals with 1 thing (The Key).
- ✅ **Plug & Play**: No need to ask for User IDs.
- ✅ **Secure**: Still uses IP locking, so one customer can't share their key with others unless they share their server IP too.
- ✅ **Multi-IP Support**: Customers can still enter multiple IPs (comma-separated) if they have multiple servers.

---

## Security Tip:
Always **Obfuscate** your server-side code before selling it. This prevents people from simply deleting the `VerifyLicense()` function call.
