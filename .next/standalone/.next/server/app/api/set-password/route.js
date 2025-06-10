"use strict";
(() => {
var exports = {};
exports.id = 235;
exports.ids = [235];
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

/***/ 6113:
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ 8514:
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

// NAMESPACE OBJECT: ./app/api/set-password/route.ts
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  "POST": () => (POST)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/node-polyfill-headers.js
var node_polyfill_headers = __webpack_require__(6145);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/app-route/module.js
var app_route_module = __webpack_require__(9532);
var module_default = /*#__PURE__*/__webpack_require__.n(app_route_module);
// EXTERNAL MODULE: ./lib/prisma.ts + 1 modules
var prisma = __webpack_require__(9102);
// EXTERNAL MODULE: ./node_modules/bcryptjs/index.js
var bcryptjs = __webpack_require__(6167);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/exports/next-response.js
var next_response = __webpack_require__(3804);
;// CONCATENATED MODULE: ./app/api/set-password/route.ts
// /app/api/set-password/route.ts



async function POST(req) {
    try {
        const { token , password  } = await req.json();
        if (!token || !password) {
            return next_response/* default.json */.Z.json({
                error: "Missing token or password"
            }, {
                status: 400
            });
        }
        // Find activation token and related employee
        const activationToken = await prisma/* prisma.activationToken.findUnique */._.activationToken.findUnique({
            where: {
                token
            },
            include: {
                employee: true
            }
        });
        if (!activationToken || !activationToken.employee) {
            return next_response/* default.json */.Z.json({
                error: "Invalid or expired activation token"
            }, {
                status: 400
            });
        }
        // Hash password and update employee
        const hashedPassword = await bcryptjs/* default.hash */.ZP.hash(password, 10);
        await prisma/* prisma.employee.update */._.employee.update({
            where: {
                id: activationToken.employeeId
            },
            data: {
                password: hashedPassword
            }
        });
        // Delete activation token
        await prisma/* prisma.activationToken.delete */._.activationToken["delete"]({
            where: {
                token
            }
        });
        return next_response/* default.json */.Z.json({
            success: true
        });
    } catch (error) {
        console.error("Error in set-password route:", error);
        return next_response/* default.json */.Z.json({
            error: "Server error"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?page=%2Fapi%2Fset-password%2Froute&name=app%2Fapi%2Fset-password%2Froute&pagePath=private-next-app-dir%2Fapi%2Fset-password%2Froute.ts&appDir=C%3A%5CUsers%5Cmacke%5CDownloads%5CCoreNZ%5Cclean-corenz-frontend%5Capp&appPaths=%2Fapi%2Fset-password%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&assetPrefix=&nextConfigOutput=standalone&preferredRegion=!

    

    

    

    const routeModule = new (module_default())({
    userland: route_namespaceObject,
    pathname: "/api/set-password",
    resolvedPagePath: "C:\\Users\\macke\\Downloads\\CoreNZ\\clean-corenz-frontend\\app\\api\\set-password\\route.ts",
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

    const originalPathname = "/api/set-password/route"

    

/***/ }),

/***/ 9102:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "_": () => (/* binding */ prisma)
});

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


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [636,474,716], () => (__webpack_exec__(8514)));
module.exports = __webpack_exports__;

})();