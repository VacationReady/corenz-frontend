exports.id = 663;
exports.ids = [663];
exports.modules = {

/***/ 68907:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 31546))

/***/ }),

/***/ 95361:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 89222, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 78301, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 83751, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 54765, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 5192, 23))

/***/ }),

/***/ 31546:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ ClientSidebarWrapper)
});

// EXTERNAL MODULE: external "next/dist/compiled/react/jsx-runtime"
var jsx_runtime_ = __webpack_require__(56786);
// EXTERNAL MODULE: ./node_modules/next/link.js
var next_link = __webpack_require__(31621);
var link_default = /*#__PURE__*/__webpack_require__.n(next_link);
// EXTERNAL MODULE: external "next/dist/compiled/react"
var react_ = __webpack_require__(18038);
// EXTERNAL MODULE: ./node_modules/next-auth/react/index.js
var react = __webpack_require__(63370);
// EXTERNAL MODULE: ./node_modules/lucide-react/dist/cjs/lucide-react.js
var lucide_react = __webpack_require__(64660);
;// CONCATENATED MODULE: ./components/Sidebar.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 




function SidebarLink({ href , label , icon: Icon , isCollapsed  }) {
    const [pathname, setPathname] = (0,react_.useState)("");
    (0,react_.useEffect)(()=>{
        if (false) {}
    }, []);
    const isActive = pathname.startsWith(href);
    return /*#__PURE__*/ (0,jsx_runtime_.jsxs)((link_default()), {
        href: href,
        className: `flex items-center px-3 py-2 rounded hover:bg-blue-100 ${isActive ? "bg-blue-200 text-blue-800 font-semibold" : "text-gray-700"}`,
        children: [
            /*#__PURE__*/ jsx_runtime_.jsx(Icon, {
                className: "w-5 h-5 mr-2"
            }),
            !isCollapsed && label
        ]
    });
}
function Sidebar() {
    const [collapsed, setCollapsed] = (0,react_.useState)(false);
    const [dropdownOpen, setDropdownOpen] = (0,react_.useState)(false);
    const dropdownRef = (0,react_.useRef)(null);
    const sessionResult = (0,react.useSession)();
    const session = sessionResult?.data;
    const user = session?.user;
    (0,react_.useEffect)(()=>{
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
    return /*#__PURE__*/ (0,jsx_runtime_.jsxs)("aside", {
        className: `transition-all duration-200 bg-white shadow-md p-4 flex flex-col justify-between ${collapsed ? "w-20" : "w-64"}`,
        children: [
            /*#__PURE__*/ (0,jsx_runtime_.jsxs)("div", {
                children: [
                    /*#__PURE__*/ (0,jsx_runtime_.jsxs)("div", {
                        className: "flex items-center justify-between mb-6",
                        children: [
                            !collapsed && /*#__PURE__*/ jsx_runtime_.jsx("h1", {
                                className: "text-2xl font-bold text-blue-600",
                                children: "CoreNZ"
                            }),
                            /*#__PURE__*/ jsx_runtime_.jsx("button", {
                                onClick: ()=>setCollapsed(!collapsed),
                                className: "text-gray-500 hover:text-gray-700",
                                children: collapsed ? /*#__PURE__*/ jsx_runtime_.jsx(lucide_react/* Menu */.v2r, {}) : /*#__PURE__*/ jsx_runtime_.jsx(lucide_react/* ChevronLeft */.s$$, {})
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,jsx_runtime_.jsxs)("div", {
                        className: "relative mb-4",
                        ref: dropdownRef,
                        children: [
                            /*#__PURE__*/ (0,jsx_runtime_.jsxs)("button", {
                                onClick: ()=>setDropdownOpen(!dropdownOpen),
                                className: "w-full flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 px-3 py-2 rounded",
                                children: [
                                    /*#__PURE__*/ (0,jsx_runtime_.jsxs)("span", {
                                        className: "flex items-center",
                                        children: [
                                            /*#__PURE__*/ jsx_runtime_.jsx(lucide_react/* User */.sLt, {
                                                className: "w-5 h-5 mr-2"
                                            }),
                                            !collapsed && (user?.name || user?.email || "My Profile")
                                        ]
                                    }),
                                    !collapsed && /*#__PURE__*/ jsx_runtime_.jsx(lucide_react/* ChevronLeft */.s$$, {
                                        className: `w-4 h-4 transform ${dropdownOpen ? "rotate-90" : ""}`
                                    })
                                ]
                            }),
                            dropdownOpen && !collapsed && /*#__PURE__*/ (0,jsx_runtime_.jsxs)("div", {
                                className: "absolute right-0 mt-2 w-full bg-white border rounded shadow z-10",
                                children: [
                                    /*#__PURE__*/ jsx_runtime_.jsx((link_default()), {
                                        href: "/profile",
                                        className: "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
                                        children: "My Profile"
                                    }),
                                    /*#__PURE__*/ jsx_runtime_.jsx("button", {
                                        onClick: ()=>(0,react.signOut)({
                                                callbackUrl: "/login"
                                            }),
                                        className: "w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100",
                                        children: "Logout"
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,jsx_runtime_.jsxs)("nav", {
                        className: "flex flex-col space-y-2",
                        children: [
                            /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                                href: "/dashboard",
                                label: "Dashboard",
                                icon: lucide_react/* Home */.SK8,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                                href: "/employees",
                                label: "Employees",
                                icon: lucide_react/* Users */.Qaw,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                                href: "/calendar",
                                label: "Calendar",
                                icon: lucide_react/* Calendar */.faS,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                                href: "/documents",
                                label: "Documents",
                                icon: lucide_react/* FileText */.acj,
                                isCollapsed: collapsed
                            }),
                            /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                                href: "/reports",
                                label: "Reports",
                                icon: lucide_react/* BarChart2 */.kM3,
                                isCollapsed: collapsed
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ jsx_runtime_.jsx("div", {
                className: "border-t pt-4",
                children: /*#__PURE__*/ jsx_runtime_.jsx(SidebarLink, {
                    href: "/settings",
                    label: "Settings",
                    icon: lucide_react/* Settings */.Zrf,
                    isCollapsed: collapsed
                })
            })
        ]
    });
}

;// CONCATENATED MODULE: ./components/ClientSidebarWrapper.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 

function ClientSidebarWrapper() {
    return /*#__PURE__*/ jsx_runtime_.jsx(Sidebar, {});
}


/***/ }),

/***/ 32786:
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
var jsx_runtime_ = __webpack_require__(56786);
// EXTERNAL MODULE: ./styles/globals.css
var globals = __webpack_require__(46495);
// EXTERNAL MODULE: ./node_modules/next/dist/build/webpack/loaders/next-flight-loader/module-proxy.js
var module_proxy = __webpack_require__(35985);
;// CONCATENATED MODULE: ./components/ClientSidebarWrapper.tsx

const proxy = (0,module_proxy.createProxy)(String.raw`C:\Users\macke\Downloads\CoreNZ\clean-corenz-frontend\components\ClientSidebarWrapper.tsx`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
/* harmony default export */ const ClientSidebarWrapper = (proxy.default);

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
                /*#__PURE__*/ jsx_runtime_.jsx(ClientSidebarWrapper, {}),
                /*#__PURE__*/ jsx_runtime_.jsx("main", {
                    className: "flex-1 overflow-y-auto p-6",
                    children: children
                })
            ]
        })
    });
}


/***/ }),

/***/ 46495:
/***/ (() => {



/***/ })

};
;