"use strict";
(() => {
var exports = {};
exports.id = 973;
exports.ids = [973];
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

/***/ 39491:
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ 14300:
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ 6113:
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ 82361:
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ 13685:
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ 95687:
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ 84492:
/***/ ((module) => {

module.exports = require("node:stream");

/***/ }),

/***/ 63477:
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ 12781:
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ 57310:
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ 73837:
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ 59796:
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ 46288:
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

// NAMESPACE OBJECT: ./app/api/leave-request/[id]/route.ts
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  "PATCH": () => (PATCH)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/node-polyfill-headers.js
var node_polyfill_headers = __webpack_require__(76145);
// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/app-route/module.js
var app_route_module = __webpack_require__(19532);
var module_default = /*#__PURE__*/__webpack_require__.n(app_route_module);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/exports/next-response.js
var next_response = __webpack_require__(83804);
// EXTERNAL MODULE: ./node_modules/next-auth/next/index.js
var next = __webpack_require__(91071);
// EXTERNAL MODULE: ./lib/auth-options.ts
var auth_options = __webpack_require__(78924);
// EXTERNAL MODULE: ./lib/prisma.ts
var prisma = __webpack_require__(88560);
// EXTERNAL MODULE: ./node_modules/resend/dist/index.mjs
var dist = __webpack_require__(80246);
;// CONCATENATED MODULE: ./app/api/leave-request/[id]/route.ts





const resend = new dist/* Resend */.R(process.env.RESEND_API_KEY);
async function PATCH(req, { params  }) {
    const session = await (0,next/* getServerSession */.Z1)(auth_options/* authOptions */.L);
    if (!session || session.user?.role !== "MANAGER") {
        return next_response/* default.json */.Z.json({
            error: "Unauthorized"
        }, {
            status: 403
        });
    }
    const { status  } = await req.json();
    const updatedRequest = await prisma/* prisma.leaveRequest.update */._.leaveRequest.update({
        where: {
            id: params.id
        },
        data: {
            status
        },
        include: {
            user: true
        }
    });
    if (updatedRequest.user?.email) {
        await resend.emails.send({
            from: "hr@corenz.io",
            to: updatedRequest.user.email,
            subject: "Leave Request Update",
            html: `<p>Your leave request from ${updatedRequest.startDate.toDateString()} to ${updatedRequest.endDate.toDateString()} has been <strong>${updatedRequest.status}</strong>.</p>`
        });
    }
    return next_response/* default.json */.Z.json(updatedRequest);
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?page=%2Fapi%2Fleave-request%2F%5Bid%5D%2Froute&name=app%2Fapi%2Fleave-request%2F%5Bid%5D%2Froute&pagePath=private-next-app-dir%2Fapi%2Fleave-request%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5Cmacke%5CDownloads%5CCoreNZ%5Cclean-corenz-frontend%5Capp&appPaths=%2Fapi%2Fleave-request%2F%5Bid%5D%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&assetPrefix=&nextConfigOutput=&preferredRegion=!

    

    

    

    const routeModule = new (module_default())({
    userland: route_namespaceObject,
    pathname: "/api/leave-request/[id]",
    resolvedPagePath: "C:\\Users\\macke\\Downloads\\CoreNZ\\clean-corenz-frontend\\app\\api\\leave-request\\[id]\\route.ts",
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

    const originalPathname = "/api/leave-request/[id]/route"

    

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [636,601,716,804,609,646,246,560,924], () => (__webpack_exec__(46288)));
module.exports = __webpack_exports__;

})();