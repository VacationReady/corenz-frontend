"use strict";
(() => {
var exports = {};
exports.id = 572;
exports.ids = [572,560];
exports.modules = {

/***/ 53524:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 97783:
/***/ ((module) => {

module.exports = require("next/dist/compiled/@edge-runtime/cookies");

/***/ }),

/***/ 28530:
/***/ ((module) => {

module.exports = require("next/dist/compiled/@opentelemetry/api");

/***/ }),

/***/ 54426:
/***/ ((module) => {

module.exports = require("next/dist/compiled/chalk");

/***/ }),

/***/ 40252:
/***/ ((module) => {

module.exports = require("next/dist/compiled/cookie");

/***/ }),

/***/ 56786:
/***/ ((module) => {

module.exports = require("next/dist/compiled/react/jsx-runtime");

/***/ }),

/***/ 2188:
/***/ ((module) => {

module.exports = require("prettier/plugins/html");

/***/ }),

/***/ 87413:
/***/ ((module) => {

module.exports = require("prettier/standalone");

/***/ }),

/***/ 6113:
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ 84492:
/***/ ((module) => {

module.exports = require("node:stream");

/***/ }),

/***/ 12781:
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ 73837:
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ 38990:
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

// NAMESPACE OBJECT: ./app/api/employees/route.ts
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  "GET": () => (GET),
  "POST": () => (POST)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/node-polyfill-headers.js
var node_polyfill_headers = __webpack_require__(76145);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/app-route/module.js
var app_route_module = __webpack_require__(19532);
var module_default = /*#__PURE__*/__webpack_require__.n(app_route_module);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/exports/next-response.js
var next_response = __webpack_require__(83804);
// EXTERNAL MODULE: ./lib/prisma.ts
var prisma = __webpack_require__(88560);
// EXTERNAL MODULE: ./node_modules/resend/dist/index.mjs
var dist = __webpack_require__(80246);
// EXTERNAL MODULE: ./node_modules/uuid/dist/esm-node/v4.js
var v4 = __webpack_require__(73609);
;// CONCATENATED MODULE: ./app/api/employees/route.ts




const resend = new dist/* Resend */.R(process.env.RESEND_API_KEY);
async function POST(req) {
    try {
        const { firstName , lastName , email , phone , department , jobRole  } = await req.json();
        const token = (0,v4/* default */.Z)();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
        const newEmployee = await prisma/* prisma.employee.create */._.employee.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                department,
                jobRole,
                isActive: false,
                activationTokens: {
                    create: {
                        token,
                        expiresAt
                    }
                }
            }
        });
        const activationLink = `https://corenz-frontend.vercel.app/activate?token=${token}`;
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Activate Your CoreNZ Account",
            html: `<p>Hello ${firstName},</p><p>Click <a href="${activationLink}">here</a> to activate your account.</p>`
        });
        return next_response/* default.json */.Z.json({
            message: "Employee created and email sent."
        }, {
            status: 201
        });
    } catch (error) {
        console.error("Error in employee creation:", error);
        return next_response/* default.json */.Z.json({
            error: "Something went wrong."
        }, {
            status: 500
        });
    }
}
async function GET() {
    try {
        const employees = await prisma/* prisma.employee.findMany */._.employee.findMany();
        return next_response/* default.json */.Z.json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        return next_response/* default.json */.Z.json({
            error: "Failed to load employees"
        }, {
            status: 500
        });
    }
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?page=%2Fapi%2Femployees%2Froute&name=app%2Fapi%2Femployees%2Froute&pagePath=private-next-app-dir%2Fapi%2Femployees%2Froute.ts&appDir=C%3A%5CUsers%5Cmacke%5CDownloads%5CCoreNZ%5Cclean-corenz-frontend%5Capp&appPaths=%2Fapi%2Femployees%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&assetPrefix=&nextConfigOutput=&preferredRegion=!

    

    

    

    const routeModule = new (module_default())({
    userland: route_namespaceObject,
    pathname: "/api/employees",
    resolvedPagePath: "C:\\Users\\macke\\Downloads\\CoreNZ\\clean-corenz-frontend\\app\\api\\employees\\route.ts",
    nextConfigOutput: undefined,
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

    const originalPathname = "/api/employees/route"

    

/***/ }),

/***/ 88560:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "_": () => (/* binding */ prisma)
/* harmony export */ });
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(53524);
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);
// lib/prisma.ts

const globalForPrisma = globalThis;
// Avoid creating multiple Prisma clients during development (hot reload safe)
const prisma = globalForPrisma.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({
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
var __webpack_exports__ = __webpack_require__.X(0, [636,601,804,609,246], () => (__webpack_exec__(38990)));
module.exports = __webpack_exports__;

})();