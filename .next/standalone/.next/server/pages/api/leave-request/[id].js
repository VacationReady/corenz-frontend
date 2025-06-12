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
/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(320);
/* harmony import */ var _lib_auth_options__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7299);



async function handler(req, res) {
    const session = await (0,next_auth_next__WEBPACK_IMPORTED_MODULE_0__.getServerSession)(req, res, {
        ..._lib_auth_options__WEBPACK_IMPORTED_MODULE_2__.authOptions,
        session: {
            ..._lib_auth_options__WEBPACK_IMPORTED_MODULE_2__.authOptions.session,
            strategy: _lib_auth_options__WEBPACK_IMPORTED_MODULE_2__.authOptions.session.strategy
        }
    });
    if (!session) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
    const leaveId = req.query.id;
    if (req.method === "PUT") {
        try {
            const { status  } = req.body;
            const updatedLeave = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__/* .prisma.leaveRequest.update */ ._.leaveRequest.update({
                where: {
                    id: leaveId
                },
                data: {
                    status,
                    reviewedById: session.user.id,
                    reviewedAt: new Date()
                }
            });
            return res.status(200).json(updatedLeave);
        } catch (error) {
            console.error("Error updating leave request:", error);
            return res.status(500).json({
                error: "Failed to update leave request"
            });
        }
    }
    return res.status(405).json({
        error: "Method not allowed"
    });
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