# saltcorn-tblprov-ldap

This is Saltcorn plugin, to use it you need install it into your saltcorn instance/tenant.

Table provider for LDAP protocol.

## Usage

As with any table provider you can create table with LDAP provider.
On next page you can fill configuration fields almost same as in `auth-ldap`.
As with all table providers resulting table is read-only.

### Columns

 1. id - Primary key from order.
 2. dn - Distinguished name
 3. data - JSON object with fetched fields. Value is either array or single element of array.
 4. ldap_data - (undoc) JSON object of raw data returned by library. Not recommended to use as it's format can be changed with library.

### Data

Logic of converting attributes to object fields contained in `ldap_get_attribute_entry()`.

## TODO

 * Document data conversion.
 * Implement converting types of fields. Examples:
   * Convert to Date AD field `whenCreated` formatted as YYYYmmddHHMMSS.fZ.
   * Convert to Date AD field `lastLogon` (which is `10^-8` seconds since `1601-01-01`).
   * Convert to boolean AD field `mDBUseDefaults`.
   * Revert conversion to Buffer (or ArrayBuffer, Int8Array) of binary-only fields like AD field `objectSid`.
