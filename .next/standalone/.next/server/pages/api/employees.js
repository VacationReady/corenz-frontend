"use strict";
(() => {
var exports = {};
exports.id = 175;
exports.ids = [175];
exports.modules = {

/***/ 3524:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 320:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "_": () => (/* binding */ prisma)
/* harmony export */ });
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3524);
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


/***/ }),

/***/ 2142:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ handler)
});

// EXTERNAL MODULE: ./lib/prisma.ts
var prisma = __webpack_require__(320);
;// CONCATENATED MODULE: external "resend"
const external_resend_namespaceObject = require("resend");
;// CONCATENATED MODULE: external "uuid"
const external_uuid_namespaceObject = require("uuid");
;// CONCATENATED MODULE: ./pages/api/employees.ts



const resend = new external_resend_namespaceObject.Resend(process.env.RESEND_API_KEY);
async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const { firstName , lastName , email , phone , department , jobRole  } = req.body;
            const token = (0,external_uuid_namespaceObject.v4)();
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
            return res.status(201).json({
                message: "Employee created and email sent."
            });
        } catch (error) {
            console.error("Error in employee creation:", error);
            return res.status(500).json({
                error: "Something went wrong."
            });
        }
    } else if (req.method === "GET") {
        try {
            const employees = await prisma/* prisma.employee.findMany */._.employee.findMany();
            return res.status(200).json(employees);
        } catch (error) {
            console.error("Error fetching employees:", error);
            return res.status(500).json({
                error: "Failed to load employees"
            });
        }
    } else {
        res.setHeader("Allow", [
            "GET",
            "POST"
        ]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(2142));
module.exports = __webpack_exports__;

})();