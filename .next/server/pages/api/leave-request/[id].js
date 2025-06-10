"use strict";
(() => {
var exports = {};
exports.id = 151;
exports.ids = [151];
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

/***/ 8400:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var next_auth_next__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2113);
/* harmony import */ var next_auth_next__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth_next__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lib_auth_options__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7299);
/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(320);
// pages/api/leave-request/[id].ts



async function handler(req, res) {
    const session = await (0,next_auth_next__WEBPACK_IMPORTED_MODULE_0__.getServerSession)(req, res, _lib_auth_options__WEBPACK_IMPORTED_MODULE_1__/* .authOptions */ .L);
    if (!session?.user?.id) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
    const { id  } = req.query;
    if (typeof id !== "string") {
        return res.status(400).json({
            error: "Invalid ID"
        });
    }
    if (req.method === "GET") {
        try {
            const leaveRequest = await _lib_prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma.leaveRequest.findUnique */ ._.leaveRequest.findUnique({
                where: {
                    id
                }
            });
            if (!leaveRequest) {
                return res.status(404).json({
                    error: "Leave request not found"
                });
            }
            if (leaveRequest.userId !== session.user.id) {
                return res.status(403).json({
                    error: "Forbidden"
                });
            }
            return res.status(200).json(leaveRequest);
        } catch (error) {
            console.error("Error fetching leave request:", error);
            return res.status(500).json({
                error: "Failed to fetch leave request"
            });
        }
    }
    // Other methods (PUT, DELETE) can be added here if needed
    res.setHeader("Allow", [
        "GET"
    ]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [299], () => (__webpack_exec__(8400)));
module.exports = __webpack_exports__;

})();