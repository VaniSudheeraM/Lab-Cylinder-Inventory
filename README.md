# EC3+SpectroCatalytics Lab Gas Cylinder Inventory

A shared, live board of the lab's gas cylinders: what we have, where it is, what's running low, and what has been ordered.

**Open the board:** https://vanisudheeram.github.io/Lab-Cylinder-Inventory/

> **The lab PIN is for EC3+SpectroCatalytics lab members only.**
> Please don't share it outside the group or post it in public chats. If you need the PIN, or think it has leaked, email **ch23d405@smail.iitm.ac.in**.

---

## Logging in

1. Open the board link and click **Log in**.
2. Enter **your name** and the **lab PIN**.
3. Your browser remembers you. Click **Log out** at the top right when you're on a shared or public computer.

Your name is saved with every change you make, so use your real name. If the PIN is changed, everyone is asked to log in again.

---

## What's on the board

### Top bar
- **Live · updated …:** the board refreshes by itself about every 20 seconds, so changes by others appear without reloading.
- **Who's here:** shows which lab members have the board open right now.
- **Editing as … / Log out:** who you're logged in as.
- **Buttons:**
  - **Add cylinder:** register a new cylinder.
  - **Request cylinders:** ask for gas to be ordered.
  - **Export CSV:** download the whole register to open in Excel.
  - **Import CSV:** add or update many cylinders from a spreadsheet. Rows are matched by cylinder number, and nothing is deleted.

### Status counts
Five tiles: **All cylinders**, **In use**, **Full**, **Idle** and **Empty**. Click a tile to show only those cylinders in the register, and click it again to show all.

| Status | Meaning |
|---|---|
| **In use** | Connected and being used right now |
| **Full** | A spare, unopened cylinder, ready to connect |
| **Idle** | Partly used, not running at the moment ("Not in use") |
| **Empty** | Finished; needs to go back to the supplier or be refilled |

### Where they are (room map)
A simple sketch of **Room 403**, **Room 404**, **Room 413** and the corridor (**Outside 403 / 404**, **Outside 413**). Each box shows how many cylinders are there, a coloured bar by status, and the gases present. **Click a box** to see only that location's cylinders. The map isn't to scale.

### Stock by gas
One row per gas, with how many are **Full / In use / Idle / Empty**.
- A **NO SPARE** tag means that gas is in use but there's no full cylinder left. Consider raising a request.
- Click a gas to filter the register to it.
- The small tag next to each gas is its **hazard group**: **FLAM** (flammable), **TOX** (toxic), **OXID** (oxidiser) or **INERT**. It is guessed from the gas name, so **always check the cylinder label and SDS**.

### Register (the full list)
Every cylinder, with its number, gas, purity, size (**B** = big, **S** = small), status, line connection, location, rent/own, supplier, user or instrument, and the date and person of the last update.

- **Search box:** type a cylinder number, gas, instrument, name or remark.
- **Filters:** gas, rent/own, supplier, location and line connection.
- **Quick updates:**
  - Change a cylinder's **status** using the coloured dropdown in its row.
  - Click **Connected / Not conn.** to switch the line connection on or off.
- **Edit:** opens the full details of a cylinder. Change anything (location, user, remarks…) and click **Save**. **Delete** removes a cylinder from the register; you need to click it twice.
- Click a **column heading** to sort by it.
- A **✎ name** tag on a row means someone else has that cylinder open right now.
- Rows that someone else just changed **light up briefly**.

### Recent changes
The last 8 updates: who changed which cylinder, its new status, and when.

### Open requests
Gas that has been asked for but hasn't arrived yet. Each request moves through three steps:

1. **Requested:** someone has asked for it (click **Request cylinders**).
2. **Ordered:** click **Mark ordered** once the order is placed with the supplier.
3. **Received:** click **Received** when it arrives. A form opens so you can add the new cylinder to the register straight away.

**Cancel** closes a request that's no longer needed.

### Order history
Every request ever made, with its status and dates. **Download CSV** saves it as a file to open in Excel.

---

## Good habits
- **Update the status when you change something.** For example, when you connect a full cylinder, set it to **In use**. When it runs out, set it to **Empty**.
- **Moved a cylinder?** Edit it and change its **Location**.
- **Raise a request early** when a gas shows **NO SPARE**.
- **Use Remarks** for anything others should know, such as "regulator faulty" or "return to supplier".

---

## Questions or problems
Email **ch23d405@smail.iitm.ac.in**.

The data is stored in the lab's Google Sheet, and the board runs on GitHub Pages.
Built with the help of [Claude](https://claude.ai) by Anthropic.
