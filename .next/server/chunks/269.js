exports.id = 269;
exports.ids = [269];
exports.modules = {

/***/ 5361:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 9222, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 8301, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 3751, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 4765, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 5192, 23))

/***/ }),

/***/ 3522:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 2788))

/***/ }),

/***/ 2788:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Sidebar)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6786);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1621);
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_link__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8038);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var next_auth_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3370);
/* harmony import */ var next_auth_react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_auth_react__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4660);
/* __next_internal_client_entry_do_not_use__ default auto */ 




function SidebarLink({ href , label , icon: Icon , isCollapsed  }) {
    const [pathname, setPathname] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)("");
    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{
        if (false) {}
    }, []);
    const isActive = pathname.startsWith(href);
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {
        href: href,
        className: `flex items-center px-3 py-2 rounded hover:bg-blue-100 ${isActive ? "bg-blue-200 text-blue-800 font-semibold" : "text-gray-700"}`,
        children: [
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(Icon, {
                className: "w-5 h-5 mr-2"
            }),
            !isCollapsed && label
        ]
    });
}
function Sidebar() {
    const [collapsed, setCollapsed] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
    const [dropdownOpen, setDropdownOpen] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(false);
    const dropdownRef = (0,react__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);
    const { data: session  } = (0,next_auth_react__WEBPACK_IMPORTED_MODULE_3__.useSession)();
    const user = session?.user;
    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{
        const handleClickOutside = (event)=>{
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return ()=>{
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("aside", {
        className: `transition-all duration-200 bg-white shadow-md p-4 flex flex-col justify-between ${collapsed ? "w-20" : "w-64"}`,
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        className: "flex items-center justify-between mb-6",
                        children: [
                            !collapsed && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("h1", {
                                className: "text-2xl font-bold text-blue-600",
                                children: "CoreNZ"
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("button", {
                                onClick: ()=>setCollapsed(!collapsed),
                                className: "text-gray-500 hover:text-gray-700",
                                children: collapsed ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .Menu */ .v2r, {}) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .ChevronLeft */ .s$$, {})
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        className: "relative mb-4",
                        ref: dropdownRef,
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("button", {
                                onClick: ()=>setDropdownOpen(!dropdownOpen),
                                className: "w-full flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 px-3 py-2 rounded",
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .User */ .sLt, {
                                                className: "w-5 h-5 mr-2"
                                            }),
                                            !collapsed && (user?.name || user?.email || "My Profile")
                                        ]
                                    }),
                                    !collapsed && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .ChevronLeft */ .s$$, {
                                        className: `w-4 h-4 transform ${dropdownOpen ? "rotate-90" : ""}`
                                    })
                                ]
                            }),
                            dropdownOpen && !collapsed && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                className: "absolute right-0 mt-2 w-full bg-white border rounded shadow z-10",
                                children: [
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {
                                        href: "/profile",
                                        className: "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
                                        children: "My Profile"
                                    }),
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("button", {
                                        onClick: ()=>(0,next_auth_react__WEBPACK_IMPORTED_MODULE_3__.signOut)({
                                                callbackUrl: "/login"
                                            }),
                                        className: "w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100",
                                        children: "Logout"
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("nav", {
                        className: "flex flex-col space-y-2",
                        children: [
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                                href: "/dashboard",
                                label: "Dashboard",
                                icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .Home */ .SK8,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                                href: "/employees",
                                label: "Employees",
                                icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .Users */ .Qaw,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                                href: "/calendar",
                                label: "Calendar",
                                icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .Calendar */ .faS,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                                href: "/documents",
                                label: "Documents",
                                icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .FileText */ .acj,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                                href: "/reports",
                                label: "Reports",
                                icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .BarChart2 */ .kM3,
                                isCollapsed: collapsed
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                className: "border-t pt-4",
                children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(SidebarLink, {
                    href: "/settings",
                    label: "Settings",
                    icon: lucide_react__WEBPACK_IMPORTED_MODULE_4__/* .Settings */ .Zrf,
                    isCollapsed: collapsed
                })
            })
        ]
    });
}


/***/ }),

/***/ 257:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ RootLayout),
  "metadata": () => (/* binding */ metadata)
});

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6786);
// EXTERNAL MODULE: ./styles/globals.css
var globals = __webpack_require__(6495);
// EXTERNAL MODULE: ./node_modules/next/dist/build/webpack/loaders/next-flight-loader/module-proxy.js
var module_proxy = __webpack_require__(5985);
;// CONCATENATED MODULE: ./components/Sidebar.tsx

const proxy = (0,module_proxy.createProxy)(String.raw`C:\Users\macke\Downloads\CoreNZ\clean-corenz-frontend\components\Sidebar.tsx`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
/* harmony default export */ const Sidebar = (proxy.default);

;// CONCATENATED MODULE: ./app/layout.tsx



const metadata = {
    title: "CoreNZ HR",
    description: "HR platform for NZ businesses"
};
function RootLayout({ children  }) {
    return /*#__PURE__*/ jsx_runtime_.jsx("html", {
        lang: "en",
        children: /*#__PURE__*/ (0,jsx_runtime_.jsxs)("body", {
            className: "flex h-screen bg-gray-100",
            children: [
                /*#__PURE__*/ jsx_runtime_.jsx(Sidebar, {}),
                /*#__PURE__*/ jsx_runtime_.jsx("main", {
                    className: "flex-1 overflow-y-auto p-6",
                    children: children
                })
            ]
        })
    });
}


/***/ }),

/***/ 6495:
/***/ (() => {



/***/ })

};
;