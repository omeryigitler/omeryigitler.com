# User Guide - Admin Panel Workflow System

> **Step-by-step guide** for managing clients, quotes, and projects.

---

## 🚀 Getting Started

### First Login

1. Navigate to `http://localhost:8000/gateway.html`
2. Enter security passphrase (configured in Firebase)
3. Click **ENTER SYSTEM**
4. Redirected to `admin.html` dashboard

### Navigation

**Sidebar Menu** (left side):
- 🏠 **DASHBOARD** - Overview and statistics
- 📧 **INBOX** - Contact messages
- 💰 **PRICING** - Pricing calculator tool
- 📋 **QUOTES** - Generated quotes
- 👥 **CLIENTS** - Customer management
- 🚀 **PROJECTS** - Active projects
- 📡 **INTELLIGENCE** - Visitor analytics
- ⚙️ **SYSTEM** - Security settings

---

## 📊 Dashboard

### Overview
- **Total Clients** - All client count
- **Pending Messages** - Unread messages
- **Active Quotes** - Draft + sent quotes
- **Running Projects** - Active projects
- **Weekly Traffic Graph** - Visitor trends
- **Recent Leads** - Latest contact submissions

### Quick Actions
- Click any metric card to jump to that section
- View real-time updates (auto-refresh)

---

## 📧 Inbox (Messages)

### Viewing Messages

1. Click **INBOX** in sidebar
2. Messages displayed in table:
   - **Name** - Sender name
   - **Email** - Contact email
   - **Message** - Preview (first 100 chars)
   - **Date** - Submission timestamp
   - **Status** - Badge (Unread, Quoted, Project Created)

### Reading a Message

1. Click any message row
2. Modal opens with full details:
   - Sender information
   - Complete message body
   - Metadata (IP, user agent)
   - Action buttons

### Creating Quote from Message

1. Open message modal
2. Click **CREATE QUOTE** button
3. Pricing tool opens with pre-filled client data
4. Fill in project details (site type, pages, etc.)
5. Review pricing breakdown
6. Click **SAVE QUOTE** in pricing tool
7. Quote saved to Firestore
8. Message status → "Quoted"
9. Client stats updated

### Creating Project from Message

1. Open message modal
2. Click **CREATE PROJECT** button
3. Enter project details:
   - Project name
   - Budget
   - Start/due dates
   - Description
4. Click **SAVE PROJECT**
5. Project created with auto-number (PR-2026-001)
6. Message status → "Project Created"

### Filtering Messages

Use filter buttons above table:
- **ALL** - Show all messages
- **UNREAD** - Only unread
- **QUOTED** - Messages with quotes
- **PROJECTS** - Messages converted to projects

---

## 💰 Pricing Tool

### Accessing Pricing Tool

**Method 1**: From Inbox
- Open message → Click **CREATE QUOTE**

**Method 2**: Direct Access
- Click **PRICING** in sidebar
- Manually enter client data

### Using Pricing Calculator

1. **Select Country**: Turkey (TRY) or Malta (EUR)
2. **Choose Site Type**:
   - Landing Page
   - Corporate Website
   - E-Commerce
   - Custom
3. **Page Count**: Number of website pages
4. **Add-ons**: Select optional features
5. **Review Breakdown**: See itemized pricing
6. **Total Price**: Auto-calculated

### Saving Quote

1. Click **SAVE QUOTE** button
2. Quote auto-saved to Firestore
3. Quote number generated (Q-2026-001)
4. Client stats updated
5. Success notification appears

---

## 📋 Quotes Management

### Viewing Quotes

1. Click **QUOTES** in sidebar
2. Quote cards displayed with:
   - Quote number (Q-2026-001)
   - Client name and email
   - Site type
   - Total price
   - Status badge
   - Creation date

### Filtering Quotes

Use filter buttons:
- **ALL** - All quotes
- **DRAFT** - Not sent yet
- **SENT** - Sent to client
- **ACCEPTED** - Client accepted

### Quote Actions

**Create Project from Quote**:
1. Click quote card
2. Click **CREATE PROJECT**
3. Project auto-filled from quote data
4. Quote status → "Accepted"

**Edit Quote** (future feature):
- Click quote → Edit button
- Modify details
- Save changes

**Send Quote** (future feature):
- Click quote → Send button
- Email PDF to client
- Status → "Sent"

---

## 👥 Client Management

### Client List View

1. Click **CLIENTS** in sidebar
2. See summary cards:
   - **Total Clients** - Overall count
   - **Active Messages** - Total messages
   - **Total Quotes** - All quotes
   - **Active Projects** - Running projects

### Client Table Columns

- **Client** - Name and email
- **Messages** - Count (gold)
- **Quotes** - Count (blue)
- **Projects** - Count (green)
- **Last Contact** - Most recent interaction
- **Action** - VIEW DETAILS button

### Viewing Client Details

1. Click **VIEW DETAILS** or click client row
2. Modal opens with:
   - **Header**: Client name and email
   - **Stats Cards**: Messages, Quotes, Projects counts
   - **Activity Timeline**: Color-coded history

### Understanding Timeline

**Color Coding**:
- 🟡 **Gold** - Messages (mail icon)
- 🔵 **Blue** - Quotes (file-text icon)
- 🟢 **Green** - Projects (rocket icon)

**Information Shown**:
- Activity type
- Brief description/preview
- Full date

**Timeline Sorting**: Newest first (descending)

---

## 🚀 Project Management

### Viewing Projects

1. Click **PROJECTS** in sidebar
2. Project cards displayed in grid:
   - Project number (PR-2026-001)
   - Project name
   - Client name
   - Status badge
   - Progress bar

### Creating New Project

**Method 1**: From Quote
- Quotes view → Click quote → CREATE PROJECT

**Method 2**: From Message
- Inbox → Open message → CREATE PROJECT

**Method 3**: Manual
- Projects view → Click **+ NEW PROJECT**
- Fill all fields manually

### Project Details

Click project card to open modal:
- **Client Information**
- **Project Metadata** (number, status)
- **Timeline** (start, due, completion dates)
- **Financial** (budget, spending)
- **Progress Tracking** (0-100%)
- **Description and Notes**

### Updating Project Status

1. Open project modal
2. Change status dropdown:
   - Active
   - Paused
   - Completed
   - Cancelled
3. Update progress slider
4. Click **SAVE**

---

## 📡 Intelligence (Visitor Tracking)

### Visitor Analytics

1. Click **INTELLIGENCE** in sidebar
2. Summary Cards:
   - **Total Visitors** (24h)
   - **Online Now** (green pulse)
   - **Top Location**
   - **Mobile Usage %**

### Live Signal Feed

Real-time visitor table:
- **Status** - Online indicator
- **Location** - Country/city
- **ISP/Org** - Internet provider
- **IP Address** - Masked (privacy)
- **Device** - Desktop/mobile
- **Pages Viewed** - Session page count
- **Last Seen** - Activity timestamp

### Privacy Note

- IPs are masked (last octet hidden)
- Data used only for analytics
- GDPR compliant

---

## ⚙️ System Settings

### Security Protocols

1. Click **SYSTEM** in sidebar
2. **Telegram Integration**:
   - Enter Bot Token
   - Enter Chat ID
   - Click **SAVE TELEGRAM CONFIG**
   - Test notification sent

### Planned Features

- Email notification settings
- Backup/restore
- User management
- API keys

---

## 🔄 Complete Workflow Example

### Scenario: New Client Contact → Quote → Project

#### Step 1: Contact Received
- Client fills contact form on website
- Message auto-created in Firestore
- Appears in **INBOX** with "Unread" badge

#### Step 2: Review Message
1. Go to INBOX
2. Click message from "John Doe"
3. Read message: "Need e-commerce website for my shop"

#### Step 3: Create Quote
1. Click **CREATE QUOTE** in message modal
2. Pricing tool opens
3. Pre-filled: John Doe, john@example.com
4. Select: E-Commerce, 15 pages
5. Review: Total = 12,500 TRY
6. Click **SAVE QUOTE**
7. Quote Q-2026-003 created
8. Message status → "Quoted"

#### Step 4: Review Quote
1. Go to **QUOTES**
2. See quote card Q-2026-003
3. Status: Draft

#### Step 5: Accept Quote & Create Project
1. (Hypothetically, client accepts)
2. Click quote card Q-2026-003
3. Click **CREATE PROJECT**
4. Auto-filled project details
5. Add: Start date, Due date
6. Click **SAVE PROJECT**
7. Project PR-2026-005 created
8. Quote status → "Accepted"

#### Step 6: Track Project
1. Go to **PROJECTS**
2. See project PR-2026-005
3. Update progress: 25%
4. Add notes: "Homepage design complete"
5. Save updates

#### Step 7: View Client History
1. Go to **CLIENTS**
2. Find John Doe
3. Click **VIEW DETAILS**
4. See timeline:
   - 🟡 Message received
   - 🔵 Quote Q-2026-003 created
   - 🟢 Project PR-2026-005 started

**Complete workflow tracked end-to-end!** ✅

---

## 💡 Tips & Best Practices

### Performance
- **Refresh page** if data seems stale (rare due to real-time sync)
- **Close modals** when done to avoid memory buildup

### Data Integrity
- Always use **CREATE QUOTE** button from messages (auto-links)
- Don't manually edit client emails (breaks relationships)

### Organization
- Add notes to projects for context
- Use status filters to focus work
- Check Intelligence daily for visitor trends

### Troubleshooting
- **Quote not saving?** Check console for Firestore errors
- **Client stats wrong?** Firestore sync issue, refresh page
- **Modal won't close?** Click X button or ESC key

---

## 🎓 Training Checklist

New admin users should practice:

- [ ] Login via gateway
- [ ] Navigate all 7 tabs
- [ ] Read a message
- [ ] Create quote from message
- [ ] Filter quotes by status
- [ ] View client detail modal
- [ ] Create project from quote
- [ ] Update project status
- [ ] View visitor intelligence
- [ ] Configure Telegram alerts

**Estimated training time**: 30 minutes

---

**Last Updated**: January 24, 2026  
**Version**: 1.0
