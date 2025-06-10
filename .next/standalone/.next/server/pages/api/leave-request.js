"use strict";
(() => {
var exports = {};
exports.id = 443;
exports.ids = [443];
exports.modules = {

/***/ 2104:
/***/ ((module) => {

module.exports = require("@next-auth/prisma-adapter");

/***/ }),

/***/ 3524:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 8432:
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ 2113:
/***/ ((module) => {

module.exports = require("next-auth/next");

/***/ }),

/***/ 7449:
/***/ ((module) => {

module.exports = require("next-auth/providers/credentials");

/***/ }),

/***/ 2493:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var next_auth_next__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2113);
/* harmony import */ var next_auth_next__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth_next__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_auth_options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7299);
/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(320);
// pages/api/leave-request.ts



async function handler(req, res) {
    const session = await (0,next_auth_next__WEBPACK_IMPORTED_MODULE_0__.getServerSession)(req, res, _lib_auth_options__WEBPACK_IMPORTED_MODULE_1__/* .authOptions */ .L);
    if (!session?.user?.id) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
    if (req.method === "POST") {
        try {
            const { type , startDate , endDate , reason  } = req.body;
            const newLeaveRequest = await _lib_prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma.leaveRequest.create */ ._.leaveRequest.create({
                data: {
                    userId: session.user.id,
                    type,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    reason,
                    status: "PENDING"
                }
            });
            return res.status(201).json(newLeaveRequest);
        } catch (error) {
            console.error("Error creating leave request:", error);
            return res.status(500).json({
                error: "Failed to create leave request"
            });
        }
    }
    if (req.method === "GET") {
        try {
            const requests = await _lib_prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma.leaveRequest.findMany */ ._.leaveRequest.findMany({
                where: {
                    userId: session.user.id
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
            return res.status(200).json(requests);
        } catch (error) {
            console.error("Error fetching leave requests:", error);
            return res.status(500).json({
                error: "Failed to fetch leave requests"
            });
        }
    }
    res.setHeader("Allow", [
        "GET",
        "POST"
    ]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [299], () => (__webpack_exec__(2493)));
module.exports = __webpack_exports__;

})();