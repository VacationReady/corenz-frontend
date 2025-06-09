"use strict";
exports.id = 924;
exports.ids = [924];
exports.modules = {

/***/ 78924:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "L": () => (/* binding */ authOptions)
/* harmony export */ });
/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(92376);
/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(19173);
/* harmony import */ var _prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(88560);
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(12716);
// lib/auth-options.ts




const authOptions = {
    adapter: (0,_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_0__/* .PrismaAdapter */ .N)(_prisma__WEBPACK_IMPORTED_MODULE_2__/* .prisma */ ._),
    providers: [
        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Z)({
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
                const isPasswordValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_3__/* ["default"].compare */ .ZP.compare(password, user.password);
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


/***/ })

};
;