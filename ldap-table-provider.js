const ldapjs = require("ldapjs-promise");
const { getState } = require("@saltcorn/data/db/state");
const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const Table = require("@saltcorn/data/models/table");
const db = require("@saltcorn/data/db");

const fixUTFDN = true; // should be moved to table/plugin config or removed after solving https://github.com/ldapjs/node-ldapjs/issues/957

function ldap_configuration_workflow(req) {
  getState().log(5, "ldap_configuration_workflow =", req.body);
  return new Workflow({
    steps: [
      {
        name: "url",
        form: async function ldap_configuration_workflow_step1form_url(
          context,
        ) {
          const tbl = Table.findOne({ id: context.table_id });
          getState().log(5, `ldap/step1/url = ${context}, ${tbl}`);
          if ((context || {}).auth) Object.assign(context, context.auth);
          else (context || {}).auth = {};
          return new Form({
            fields: [
              {
                name: "url",
                label: "Server URL",
                type: "String",
                required: true,
              },
              {
                name: "bindDN",
                label: "Bind DN",
                type: "String",
              },
              {
                name: "bindCredentials",
                label: "Bind Credentials",
                input_type: "password",
              },
              {
                name: "searchBase",
                label: "Search Base",
                type: "String",
              },
              {
                name: "searchFilter",
                label: "Search Filter",
                type: "String",
                required: true,
              },
            ],
          });
        },
      },
    ],
  });
}

async function ldap_get_fields(cfg) {
  getState().log(4, `ldap_get_fields = ${cfg}`);
  return [
    {
      name: "id",
      label: "ID",
      type: "Integer",
      primary_key: true,
      required: true,
      is_unique: true,
    },
    {
      name: "dn",
      label: "DN",
      description: "Distinguished name",
      type: "String",
      required: true,
      is_unique: true,
    },
    {
      name: "data",
      label: "Data",
      description: "JSON object with attribute fields",
      type: "JSON",
      required: true,
    },
    {
      name: "ldap_data",
      label: "Data",
      description: "Raw returned LDAP object",
      type: "JSON",
      required: true,
    },
  ];
}

var cache = new Map();
const array_attributes = new Set(["objectClass", "memberOf", "uniqueMember"]);

function ldap_get_attribute_entry(a) {
  if (a.values.length == 1 && !array_attributes.has(a.type))
    return [a.type, a.values[0]];
  return [a.type, a.values];
}

function ldap_get_row(entry, id) {
  if (entry === undefined) return { id, dn: null, data: null, ldap_data: null };
  const pojo = entry.pojo || entry;
  const attrs = Object.fromEntries(
    entry.attributes.map(ldap_get_attribute_entry),
  );
  const dn =
    (fixUTFDN ? attrs.distinguishedName : null) ||
    pojo.objectName ||
    String(entry.dn);
  const data = { dn, ...attrs };
  getState().log(5, `ldap_get_row[${id}] =`, data);
  return { id, dn, data, ldap_data: pojo };
}

async function ldap_get_table_rows(cfg, where) {
  getState().log(4, `ldap_get_table_rows = ${JSON.stringify({ cfg, where })}`);
  if (!cfg) return [];
  const ldapParameters = {
    url: cfg.url,
    tlsOptions: {},
  };
  const ldapOptions = {
    scope: "sub",
    filter: cfg.searchFilter,
    attributes: ["*", "+"],
  };
  let res, client_promise;
  try {
    let client_err, client_ok;
    client_promise = new Promise(function (ok, err) {
      client_ok = ok;
      client_err = err;
    });
    const client_err_listener = function (err) {
      client_err(err);
    };
    const ldap = ldapjs.createClient(cfg);
    try {
      ldap.on("error", client_err_listener);
      ldap.on("connectRefused", client_err_listener);
      ldap.on("connectTimeout", client_err_listener);
      ldap.on("connectError", client_err_listener);
      ldap.on("setupError", client_err_listener);
      ldap.on("socketTimeout", client_err_listener);
      ldap.on("resultError", client_err_listener);
      ldap.on("timeout", client_err_listener);
      await ldap.bind(cfg.bindDN, cfg.bindCredentials);
      client_ok(await ldap.searchReturnAll(cfg.searchBase, ldapOptions));
    } finally {
      await ldap.unbind();
    }
    res = await client_promise;
    res = res.entries.map(ldap_get_row);
  } catch (err) {
    console.error(err);
    return [{ id: 0, dn: "#error#", data: Object.assign({}, err) }];
  }
  return res;
}

function ldap_get_table(cfg, tbl) {
  getState().log(4, `ldap_get_table = ${cfg}`);
  return {
    getRows: (where) => ldap_get_table_rows(cfg, where),
    countRows: (where) => null,
  };
}

module.exports = {
  ldap_configuration_workflow,
  ldap_get_fields,
  ldap_get_table,
  ldap_get_table_rows,
  ldap_table_provider: {
    configuration_workflow: ldap_configuration_workflow,
    fields: ldap_get_fields,
    get_table: ldap_get_table,
  },
};
