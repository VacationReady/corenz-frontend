"use strict";
exports.id = 299;
exports.ids = [299];
exports.modules = {

/***/ 7299:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "L": () => (/* binding */ authOptions)
/* harmony export */ });
/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2104);
/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7449);
/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(320);
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8432);
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_3__);
// lib/auth-options.ts




const authOptions = {
    adapter: (0,_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__.PrismaAdapter)(_prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma */ ._),
    providers: [
        next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1___default()({
            name: "Credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "you@example.com"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            },
            async authorize (credentials) {
                const { email , password  } = credentials ?? {};
                if (!email || !password) return null;
                const user = await _prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma.employee.findUnique */ ._.employee.findUnique({
                    where: {
                        email
                    }
                });
                if (!user || !user.password) return null;
                const isPasswordValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_3___default().compare(password, user.password);
                if (!isPasswordValid) return null;
                return {
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role
                };
            }
        })
    ],
    pages: {
        signIn: "/login"
    },
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt ({ token , user  }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.role = user.role;
            }
            return token;
        },
        async session ({ session , token  }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.role = token.role;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET
};


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


/***/ })

};
;