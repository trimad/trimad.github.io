
---
author: Tristan Madden
categories: [Shell]
date: 2023-02-22
lastmod: 2024-06-12
tags: [net]
title: net user
thumbnail: "thumbnail.png"
summary: The "net user" command is a Command Prompt (Shell) command used to manage user accounts on a Windows operating system. It can be used to create, modify, or delete user accounts, as well as to change passwords and manage group memberships.
usePageBundles: true
toc: true
---

The "net user" command is a Command Prompt (Shell) command used to manage user accounts on a Windows operating system. It can be used to create, modify, or delete user accounts, as well as to change passwords and manage group memberships.

## Syntax

```Shell
net user [username [password | *] [options]] [/DOMAIN]
net user username {password | *} /ADD [options] [/DOMAIN]
net user username [/DELETE] [/DOMAIN]
net user username [/TIMES:{times | ALL}]
net user username [/ACTIVE: {YES | NO}]
```

## Add a user

To add a new user account:

```Shell
net user USERNAME PASSWORD /add
```

## Delete a user

To delete a user account:

```Shell
net user USERNAME /delete
```

## Add user to group

To add a user to a specific group:

*Local*

```Shell
net localgroup GROUPNAME USERNAME /add
```

*Domain*

```Shell
net localgroup GROUPNAME DOMAIN\USERNAME /add
```

## Remove user from group

To remove a user from a specific group:

*Domain*

```Shell
net localgroup GROUPNAME DOMAIN\USERNAME /delete
```

*Local*

```Shell
net localgroup GROUPNAME USERNAME /delete
```

## Reset password

To reset a password:

*Domain*

```Shell
net user USERNAME PASSWORD /domain /active:Yes
```

*Local*

```Shell
net user USERNAME PASSWORD
```

## Set password to be changed upon sign-in

To set a password for a user that must be changed upon sign-in:

*Domain*

```Shell
net user USERNAME PASSWORD /domain /logonpasswordchg:yes
```

*Local*

```Shell
net user USERNAME PASSWORD /logonpasswordchg:yes
```

## Unlock account

To unlock an account:

*Domain*

```Shell
net user USERNAME /domain /active:yes
```

*Local*

```Shell
net user USERNAME /active:yes
```

## Lock an account

To lock an account:

*Domain*

```Shell
net user USERNAME /domain /active:no
```

*Local*

```Shell
net user USERNAME /active:no
```

## Check if account is active

To check if an account is active:

_The `find` command is case-sensitive:_

```Shell
net user USERNAME | find "Account active"
```

## Set logon times

To set the logon times for a user:

```Shell
net user USERNAME /times:{times | ALL}
```

- `times`: Specifies the times that users are allowed to use the computer. The time is specified as day[-day][,day[-day]],time[-time][,time[-time]], limited to 1-hour increments.


## Options

- `username`: Name of the user account to add, delete, modify, or view.
- `password`: Assigns or changes a password for the user account.
- `*`: Produces a prompt for the password. The password is not displayed when you type it at a password prompt.
- `/DOMAIN`: Performs the operation on the primary domain controller of the current domain.
- `/ADD`: Adds a user account to the user accounts database.
- `/DELETE`: Removes a user account from the user accounts database.
- `/TIMES:{times | ALL}`: Specifies the logon hours.
- `/ACTIVE:{YES | NO}`: Activates or deactivates the user account.

This comprehensive guide provides detailed examples for various operations using the `net user` command. By understanding these commands, you can effectively manage user accounts on a Windows operating system.
