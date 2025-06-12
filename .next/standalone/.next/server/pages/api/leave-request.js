"use strict";
(() => {
var exports = {};
exports.id = 443;
exports.ids = [443];
exports.modules = {

/***/ 3524:
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ 2113:
/***/ ((module) => {

module.exports = require("next-auth/next");

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

/***/ 5996:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ handler)
});

// EXTERNAL MODULE: external "next-auth/next"
var next_ = __webpack_require__(2113);
;// CONCATENATED MODULE: ./lib/session-options.ts
// lib/session-options.ts
const sessionOptions = {
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async session ({ session , token  }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
        async jwt ({ token  }) {
            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET
};

// EXTERNAL MODULE: ./lib/prisma.ts
var prisma = __webpack_require__(320);
;// CONCATENATED MODULE: ./pages/api/leave-request.ts
// pages/api/leave-request.ts

 // ✅ NEW: minimal session-only config

async function handler(req, res) {
    const session = await (0,next_.getServerSession)(req, res, sessionOptions); // ✅ Use minimal session config
    if (!session?.user?.id) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
    if (req.method === "POST") {
        try {
            const { type , startDate , endDate , reason  } = req.body;
            const newLeaveRequest = await prisma/* prisma.leaveRequest.create */._.leaveRequest.create({
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
            const requests = await prisma/* prisma.leaveRequest.findMany */._.leaveRequest.findMany({
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
var __webpack_exports__ = (__webpack_exec__(5996));
module.exports = __webpack_exports__;

})();