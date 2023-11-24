const { ldap_table_provider } = require("./ldap-table-provider.js");

module.exports = {
  sc_plugin_api_version: 1,
  table_providers: {
    LDAP: ldap_table_provider,
  },
};
