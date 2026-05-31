// docs/VISUAL_GUIDE.md

# Visual Implementation Guide - Dynamic Role System

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER LOGIN                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────────┐
        │  Backend Validates Credentials   │
        │  Fetches User + Permissions      │
        └──────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────────────┐
        │  Redux Auth Slice                    │
        │  ├─ user                             │
        │  ├─ permissions: string[]            │
        │  ├─ customRoleId: string | undefined│
        │  ├─ accessToken                      │
        │  └─ isAuthenticated: true            │
        └──────────────────────────────────────┘
                       │
        ┌──────────────┴────────────┬────────────────┐
        ↓                           ↓                ↓
   ┌────────────┐        ┌──────────────────┐  ┌──────────────┐
   │usePermission│        │    useUser       │  │Redux Selectors
   │useUser      │        │                  │  │
   └────────────┘        └──────────────────┘  └──────────────┘
        │                           │                │
        └─────────────┬─────────────┴────────────────┘
                      ↓
        ┌─────────────────────────────────────┐
        │     Permission Guard Components     │
        ├─────────────────────────────────────┤
        │ • PermissionGuard.tsx               │
        │ • CanAccess.tsx                     │
        │ • ProtectedRoute.tsx                │
        └─────────────────────────────────────┘
                      │
        ┌─────────────┴───────────────┐
        ↓                             ↓
   ┌──────────┐               ┌─────────────┐
   │ SHOW UI  │               │ HIDE/DISABLE│
   │ Content  │               │ Fallback    │
   └──────────┘               └─────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │ POST /login
       │ email, password
       ↓
┌──────────────────┐
│  Backend API     │
│  Validates       │
└──────┬───────────┘
       │
       ├─→ ❌ Invalid → Error Response
       │
       └─→ ✅ Valid
           │
           ↓
       ┌──────────────────────────────────┐
       │ Generate Tokens + Fetch Perms    │
       └──────────────────────────────────┘
           │
           ↓
       ┌──────────────────────────────────┐
       │ Response:                        │
       │ {                                │
       │   user: {...},                   │
       │   permissions: [                 │
       │     "member:view",               │
       │     "member:create",             │
       │     "billing:view"               │
       │   ],                             │
       │   accessToken: "...",            │
       │   refreshToken: "..."            │
       │ }                                │
       └──────────────────────────────────┘
           │
           ↓ dispatch(loginUser())
       ┌──────────────────────────────────┐
       │ Redux Auth State Updated         │
       └──────────────────────────────────┘
           │
           ↓
       ┌──────────────────────────────────┐
       │ Dashboard Renders                │
       │ - Sidebar filters by perms       │
       │ - Components show/hide via guards│
       └──────────────────────────────────┘
```

## Permission Check Flow

```
Component Renders
    │
    ├─→ usePermission() / useUser() called
    │
    ├─→ Get permissions from Redux: ["member:view", "member:create"]
    │
    ├─→ Check Permission
    │   │
    │   ├─→ hasPermission("member:create")?
    │   │   │
    │   │   ├─→ Yes: return true
    │   │   │   │
    │   │   │   ↓
    │   │   │   ✅ RENDER COMPONENT
    │   │   │
    │   │   └─→ No: return false
    │   │       │
    │   │       ↓
    │   │       ❌ SHOW FALLBACK or NOTHING
    │   │
    │   └─→ can("member", "create")?
    │       └─→ Equivalent to hasPermission("member:create")
```

## Component Usage Flow

```
┌─────────────────────────────────────────┐
│      Import Permission Component        │
└──────────────┬──────────────────────────┘
               │
               ↓
    ┌──────────────────────────┐
    │ <CanAccess               │
    │   resource="member"      │
    │   action="create"        │
    │ >                        │
    │   <Button>Add</Button>   │
    │ </CanAccess>             │
    └──────────────────────────┘
               │
    ┌──────────┴──────────────┐
    ↓                         ↓
┌─────────────┐       ┌─────────────────┐
│ Permission  │       │ No Permission   │
│ Granted     │       │ Granted         │
├─────────────┤       ├─────────────────┤
│ Render:     │       │ Render:         │
│ <Button>    │       │ Nothing/Fallback│
│ Add         │       │ if provided     │
│ </Button>   │       │                 │
└─────────────┘       └─────────────────┘
    │                         │
    ↓                         ↓
 ✅ VISIBLE               ❌ HIDDEN
  & ENABLED              & DISABLED
```

## Permission Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    PERMISSION MATRIX                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  MEMBER ACCESS (4)          PACKAGE ACCESS (4)                │
│  ├─ member:view             ├─ package:view                   │
│  ├─ member:create           ├─ package:create                 │
│  ├─ member:edit             ├─ package:edit                   │
│  └─ member:delete           └─ package:delete                 │
│                                                                │
│  BILLING ACCESS (4)         ANALYTICS (2)                      │
│  ├─ billing:view            ├─ analytics:view                 │
│  ├─ billing:create          └─ analytics:export               │
│  ├─ billing:edit                                              │
│  └─ billing:delete          SMS (3)                           │
│                             ├─ sms:view                       │
│                             ├─ sms:send                       │
│                             └─ sms:template-edit              │
│  USER ACCESS (5)                                              │
│  ├─ access:view-users                                         │
│  ├─ access:create-role      TOTAL: 22 PERMISSIONS            │
│  ├─ access:edit-role                                         │
│  ├─ access:delete-role                                       │
│  └─ access:assign-role                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Sidebar Filtering Logic

```
Sidebar Component Initializes
    │
    ├─→ Get user role: "manager"
    │
    ├─→ Get user permissions: ["member:view", "member:create", "analytics:view"]
    │
    ├─→ Call getSidebarForRole("manager", permissions)
    │
    ├─→ Loop through sidebar items
    │   │
    │   ├─→ Item: Overview (no permissions required)
    │   │   └─→ ✅ SHOW
    │   │
    │   ├─→ Item: Members (requires "member:view")
    │   │   │
    │   │   ├─→ User has "member:view"?
    │   │   │   └─→ Yes: ✅ SHOW
    │   │   │
    │   │   └─→ User missing "member:view"?
    │   │       └─→ No: ❌ HIDE
    │   │
    │   ├─→ Item: Billing (requires "billing:view")
    │   │   │
    │   │   ├─→ User has "billing:view"?
    │   │   │   └─→ No: ❌ HIDE
    │   │
    │   └─→ Item: Analytics (requires "analytics:view")
    │       └─→ User has "analytics:view"?
    │           └─→ Yes: ✅ SHOW
    │
    └─→ Render filtered sidebar
        └─→ Only items user can access shown
```

## File Organization

```
silver-gym/
│
├── redux/
│   ├── features/
│   │   ├── auth/
│   │   │   └── authSlice.ts (stores permissions)
│   │   │
│   │   └── roles/
│   │       └── rolesSlice.ts (stores custom roles)
│   │
│   ├── types/
│   │   ├── auth.ts (permission state)
│   │   └── roles.ts (role types)
│   │
│   └── store/
│       └── index.ts (combined store)
│
├── hooks/
│   ├── usePermission.ts (permission checking)
│   └── useUser.ts (user + permissions)
│
├── components/
│   ├── shared/
│   │   ├── PermissionGuard.tsx (wrap components)
│   │   ├── CanAccess.tsx (resource:action wrapper)
│   │   └── ProtectedRoute.tsx (page protection)
│   │
│   ├── dashboard/
│   │   └── Sidebar/
│   │       └── Sidebar.tsx (filters by perms)
│   │
│   └── examples/
│       └── DynamicRoleExamples.tsx
│
├── config/
│   └── sidebarConfig.tsx (sidebar with permissions)
│
├── lib/
│   └── services/
│       ├── roleService.ts (API integration)
│       └── permissionService.ts (utilities)
│
├── types/
│   ├── permissions.ts (permission definitions)
│   └── user-access.ts (role types)
│
└── docs/
    ├── DYNAMIC_ROLE_IMPLEMENTATION.md (complete guide)
    ├── QUICK_REFERENCE.md (quick lookup)
    ├── IMPLEMENTATION_CHECKLIST.md (progress)
    ├── IMPLEMENTATION_SUMMARY.md (overview)
    ├── DEVELOPER_GUIDE.md (how to use)
    └── VISUAL_GUIDE.md (this file)
```

## Three-Level Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 1: PAGE LEVEL                                             │
├─────────────────────────────────────────────────────────────────┤
│ <ProtectedRoute permission="admin:access">                      │
│   <AdminPage />                                                  │
│ </ProtectedRoute>                                                │
│                                                                  │
│ Decision: Can user ACCESS this entire page?                      │
│ Result: REDIRECT if denied, SHOW page if allowed                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 2: FEATURE LEVEL                                          │
├─────────────────────────────────────────────────────────────────┤
│ <PermissionGuard permission="member:create">                    │
│   <CreateMemberSection />                                       │
│ </PermissionGuard>                                               │
│                                                                  │
│ Decision: Can user SEE this section/feature?                    │
│ Result: HIDE section if denied, SHOW if allowed                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LEVEL 3: COMPONENT LEVEL                                        │
├─────────────────────────────────────────────────────────────────┤
│ <CanAccess resource="member" action="delete">                   │
│   <Button>Delete</Button>                                        │
│ </CanAccess>                                                     │
│                                                                  │
│ Decision: Can user INTERACT with this component?                │
│ Result: HIDE component if denied, SHOW if allowed               │
└─────────────────────────────────────────────────────────────────┘
```

## State Tree

```
Redux Store
├── auth (AuthState)
│   ├── user: {
│   │   id: "1",
│   │   name: "John Doe",
│   │   email: "john@example.com",
│   │   role: "manager",
│   │   permissions: ["member:view", "member:create"],
│   │   customRoleId: undefined
│   │ }
│   ├── permissions: ["member:view", "member:create"]
│   ├── customRoleId: undefined
│   ├── accessToken: "token..."
│   ├── refreshToken: "token..."
│   ├── isAuthenticated: true
│   ├── isLoading: false
│   └── error: null
│
└── roles (RolesState)
    ├── allRoles: [{
    │   roleId: "role-1",
    │   roleName: "Manager",
    │   permissions: ["member:view", ...],
    │   isCustom: false,
    │   status: "active"
    │ }, ...]
    ├── customRoles: [...]
    ├── isLoading: false
    └── error: null
```

## Decision Tree: Which Option to Use?

```
Do I need permission checking?
│
├─→ Yes
│  │
│  ├─→ Complex conditional logic?
│  │   │
│  │   ├─→ Yes: Use usePermission() hook
│  │   │   Example: Multiple conditions, different actions
│  │   │
│  │   └─→ No: Use CanAccess/PermissionGuard
│  │       Example: Simple show/hide
│  │
│  ├─→ Entire page needs protection?
│  │   │
│  │   ├─→ Yes: Use <ProtectedRoute>
│  │   │   Redirect to dashboard if denied
│  │   │
│  │   └─→ No: Use <PermissionGuard>
│  │       Show fallback if denied
│  │
│  └─→ Single button/component?
│      │
│      ├─→ Yes: Use <CanAccess>
│      │   Clean, simple syntax
│      │
│      └─→ No: Use usePermission()
│          More control, more powerful
│
└─→ No: No permission checking needed
```

## Integration Timeline

```
┌──────────────────────────────────────────┐
│ Week 1: Core Implementation              │
├──────────────────────────────────────────┤
│ ✅ Type definitions                       │
│ ✅ Redux state management                 │
│ ✅ Hooks and components                   │
│ ✅ Sidebar integration                    │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Week 2: Backend Integration              │
├──────────────────────────────────────────┤
│ 🔄 API endpoints for roles               │
│ 🔄 API endpoints for permissions         │
│ 🔄 Login endpoint returns permissions    │
│ 🔄 Permission validation middleware      │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Week 3: Feature Implementation           │
├──────────────────────────────────────────┤
│ 📋 Role management UI                    │
│ 📋 User assignment UI                    │
│ 📋 Permission matrix UI                  │
│ 📋 Testing                               │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Week 4: Polish & Deploy                  │
├──────────────────────────────────────────┤
│ 🚀 Performance optimization              │
│ 🚀 Monitoring setup                      │
│ 🚀 Documentation                         │
│ 🚀 Production deployment                 │
└──────────────────────────────────────────┘
```

## Quick Lookup Chart

```
┌─────────────────────┬──────────────────────────────────────────┐
│ SCENARIO            │ WHAT TO USE                              │
├─────────────────────┼──────────────────────────────────────────┤
│ Hide a button       │ <CanAccess resource="x" action="y" />   │
│ Hide a section      │ <PermissionGuard permission="x:y" />    │
│ Protect a page      │ <ProtectedRoute permission="x:y" />     │
│ Complex logic       │ const {can} = usePermission()           │
│ Check any of N      │ hasAnyPermission([...])                 │
│ Check all of N      │ hasAllPermissions([...])                │
│ Get all perms       │ getAllPermissions()                      │
│ Access user data    │ const {user} = useUser()                │
│ Create a role       │ roleService.createRole(...)             │
│ Assign role         │ roleService.assignRoleToUser(...)       │
└─────────────────────┴──────────────────────────────────────────┘
```

---

End of Visual Guide
