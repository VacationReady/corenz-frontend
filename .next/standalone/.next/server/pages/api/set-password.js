"use strict";
(() => {
var exports = {};
exports.id = 833;
exports.ids = [833];
exports.modules = {

/***/ 3524:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 8432:
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ 1724:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3524);
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(8432);
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_1__);
// pages/api/set-password.ts


const prisma = new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient();
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    const { token , password  } = req.body;
    if (!token || !password) {
        return res.status(400).json({
            error: "Token and password are required."
        });
    }
    try {
        // 1. Find activation token and employee
        const activationToken = await prisma.activationToken.findUnique({
            where: {
                token
            },
            include: {
                employee: true
            }
        });
        if (!activationToken || !activationToken.employee) {
            return res.status(400).json({
                error: "Invalid or expired token."
            });
        }
        const employee = activationToken.employee;
        // 2. Check if already activated
        if (employee.isActivated) {
            return res.status(400).json({
                error: "Account already activated."
            });
        }
        // 3. Create a new User
        const hashedPassword = await bcryptjs__WEBPACK_IMPORTED_MODULE_1___default().hash(password, 10);
        await prisma.user.create({
            data: {
                email: employee.email,
                password: hashedPassword,
                firstName: employee.firstName,
                lastName: employee.lastName,
                phone: employee.phone,
                department: employee.department,
                jobRole: employee.jobRole,
                role: employee.role,
                isActivated: true
            }
        });
        // 4. Update employee record
        await prisma.employee.update({
            where: {
                id: employee.id
            },
            data: {
                isActivated: true,
                isActive: true,
                password: hashedPassword
            }
        });
        // 5. Optionally, delete the token to prevent reuse
        await prisma.activationToken.delete({
            where: {
                token
            }
        });
        return res.status(200).json({
            message: "Account activated successfully"
        });
    } catch (error) {
        console.error("Activation error:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(1724));
module.exports = __webpack_exports__;

})();