"use strict";
(() => {
var exports = {};
exports.id = 957;
exports.ids = [957];
exports.modules = {

/***/ 7783:
/***/ ((module) => {

module.exports = require("next/dist/compiled/@edge-runtime/cookies");

/***/ }),

/***/ 8530:
/***/ ((module) => {

module.exports = require("next/dist/compiled/@opentelemetry/api");

/***/ }),

/***/ 4426:
/***/ ((module) => {

module.exports = require("next/dist/compiled/chalk");

/***/ }),

/***/ 252:
/***/ ((module) => {

module.exports = require("next/dist/compiled/cookie");

/***/ }),

/***/ 138:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "headerHooks": () => (/* binding */ headerHooks),
  "originalPathname": () => (/* binding */ originalPathname),
  "requestAsyncStorage": () => (/* binding */ requestAsyncStorage),
  "routeModule": () => (/* binding */ routeModule),
  "serverHooks": () => (/* binding */ serverHooks),
  "staticGenerationAsyncStorage": () => (/* binding */ staticGenerationAsyncStorage),
  "staticGenerationBailout": () => (/* binding */ staticGenerationBailout)
});

// NAMESPACE OBJECT: ./app/api/employees/[id]/route.ts
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  "DELETE": () => (DELETE),
  "GET": () => (GET)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/node-polyfill-headers.js
var node_polyfill_headers = __webpack_require__(6145);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/app-route/module.js
var app_route_module = __webpack_require__(9532);
var module_default = /*#__PURE__*/__webpack_require__.n(app_route_module);
;// CONCATENATED MODULE: external "@prisma/client"
const client_namespaceObject = require("@prisma/client");
;// CONCATENATED MODULE: ./lib/prisma.ts
// lib/prisma.ts

const globalForPrisma = globalThis;
// Avoid creating multiple Prisma clients during development (hot reload safe)
const prisma = globalForPrisma.prisma ?? new client_namespaceObject.PrismaClient({
    log: [
        "query",
        "error",
        "warn"
    ]
});
if (false) {}

// EXTERNAL MODULE: ./node_modules/next/dist/server/web/exports/next-response.js
var next_response = __webpack_require__(3804);
;// CONCATENATED MODULE: ./app/api/employees/[id]/route.ts
// /app/api/employees/[id]/route.ts


async function GET(_, { params  }) {
    try {
        const employee = await prisma.employee.findUnique({
            where: {
                id: params.id
            }
        });
        if (!employee) {
            return next_response/* default.json */.Z.json({
                error: "Employee not found"
            }, {
                status: 404
            });
        }
        return next_response/* default.json */.Z.json(employee);
    } catch (err) {
        console.error("Error fetching employee:", err);
        return next_response/* default.json */.Z.json({
            error: "Server error"
        }, {
            status: 500
        });
    }
}
async function DELETE(_, { params  }) {
    try {
        // First delete related ActivationTokens
        await prisma.activationToken.deleteMany({
            where: {
                employeeId: params.id
            }
        });
        // Then delete the employee
        await prisma.employee["delete"]({
            where: {
                id: params.id
            }
        });
        return next_response/* default.json */.Z.json({
            message: "Employee deleted"
        });
    } catch (error) {
        console.error("Delete failed:", error);
        return next_response/* default.json */.Z.json({
            error: "Failed to delete employee"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?page=%2Fapi%2Femployees%2F%5Bid%5D%2Froute&name=app%2Fapi%2Femployees%2F%5Bid%5D%2Froute&pagePath=private-next-app-dir%2Fapi%2Femployees%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cmacke%5CDownloads%5CCoreNZ%5Cclean-corenz-frontend%5Capp&appPaths=%2Fapi%2Femployees%2F%5Bid%5D%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&assetPrefix=&nextConfigOutput=standalone&preferredRegion=!

    

    

    

    const routeModule = new (module_default())({
    userland: route_namespaceObject,
    pathname: "/api/employees/[id]",
    resolvedPagePath: "C:\\Users\\macke\\Downloads\\CoreNZ\\clean-corenz-frontend\\app\\api\\employees\\[id]\\route.ts",
    nextConfigOutput: "standalone",
  })

    // Pull out the exports that we need to expose from the module. This should
    // be eliminated when we've moved the other routes to the new format. These
    // are used to hook into the route.
    const {
      requestAsyncStorage,
      staticGenerationAsyncStorage,
      serverHooks,
      headerHooks,
      staticGenerationBailout
    } = routeModule

    const originalPathname = "/api/employees/[id]/route"

    

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [636,474], () => (__webpack_exec__(138)));
module.exports = __webpack_exports__;

})();