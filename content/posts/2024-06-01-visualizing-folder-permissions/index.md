---
author: Tristan Madden
categories: [PowerShell, Python]
date: 2024-06-01
lastmod: 2024-06-20
draft: false
featured: true
summary: "Generate a treemap of user permissions for a given folder and all subfolders."
tags: [permissions, security]
thumbnail: "thumbnail.png"
title: "Visualizing Folder Permissions"
toc: true
usePageBundles: true
---

This blog post provides a comprehensive guide to exporting folder permissions to a JSON file using PowerShell and visualizing these permissions using Python. The process involves two main scripts:

## Exporting Folder Permissions with PowerShell

This script retrieves and exports folder permissions from a specified directory and its subdirectories. It uses the Get-Acl cmdlet to gather access control information and stores this data in a custom PowerShell object. The collected permissions are then converted to JSON format and saved to a file. A limitation of this script to be aware of is that it won't work on paths greater than 260 characters. 

```PowerShell
# Define the folder path and output file path as variables
$FolderPath = "C:\Users\"
$OutputFile = "C:\Users\output.json"

function ConvertTo-Binary {
    param (
        [int]$decimal
    )
    return [Convert]::ToString($decimal, 2).PadLeft(32, '0')
}

function Get-FolderPermissions {
    param (
        [string]$Path
    )
    
    if (-Not (Test-Path -Path $Path)) {
        Write-Warning "Path '$Path' does not exist."
        return $null
    }

    $acl = Get-Acl -Path $Path
    $permissions = @()

    foreach ($access in $acl.Access) {
        $rights = [int]$access.FileSystemRights

        $bitWisePermissions = [PSCustomObject]@{
            ReadData = $rights -band 1 # 2^0
            CreateFiles = $rights -band 2 # 2^1
            AppendData = $rights -band 4 # 2^2
            ReadExtendedAttributes = $rights -band 8 # 2^3
            WriteExtendedAttributes = $rights -band 16 # 2^4
            ExecuteFile = $rights -band 32 # 2^5
            DeleteSubfoldersAndFiles = $rights -band 64 # 2^6
            ReadAttributes = $rights -band 128 # 2^7
            WriteAttributes = $rights -band 256 # 2^8
            Write = if (($rights -band 278) -eq 278) { $rights -band 278 } else { 0 } # Is a combination of other permissions
            Delete = $rights -band 65536 # 2^16
            ReadPermissions = $rights -band 131072 # 2^17
            Read = if (($rights -band 131209) -eq 131209) { $rights -band 131209 } else { 0 } # Is a combination of other permissions
            ReadAndExecute = if (($rights -band 131231) -eq 131231) { $rights -band 131231 } else { 0 } # Is a combination of other permissions
            Modify = if (($rights -band 197055) -eq 197055) { $rights -band 197055 } else { 0 } # Is a combination of other permissions
            ChangePermissions = $rights -band 262144 # 2^18
            TakeOwnership = $rights -band 524288 # 2^19
            Synchronize = $rights -band 1048576 # 2^20
            FullControl = if (($rights -band 2032127) -eq 2032127) { $rights -band 2032127 } else { 0 } # Is a combination of other permissions
        }

        $permissions += [PSCustomObject]@{
            AccessControlType = $access.AccessControlType
            BitWisePermissionsBinary = ConvertTo-Binary($rights)
            BitWisePermissions = $bitWisePermissions
            BitwisePermissionsDecimal = $rights
            IdentityReference = $access.IdentityReference
            InheritanceFlags = $access.InheritanceFlags
            IsInherited = $access.IsInherited
            PropagationFlags = $access.PropagationFlags
        }
    }

    return [PSCustomObject]@{
        Path = $Path
        Permissions = $permissions
    }
}

function Get-AllFolderPermissions {
    param (
        [string]$RootPath
    )
    
    $result = @()
    $folders = Get-ChildItem -Path $RootPath -Recurse -Directory
    
    foreach ($folder in $folders) {
        $folderPermissions = Get-FolderPermissions -Path $folder.FullName
        if ($folderPermissions -ne $null) {
            $result += $folderPermissions
        }
    }

    $rootPermissions = Get-FolderPermissions -Path $RootPath
    if ($rootPermissions -ne $null) {
        $result += $rootPermissions
    }

    return $result
}

$allPermissions = Get-AllFolderPermissions -RootPath $FolderPath
$json = $allPermissions | ConvertTo-Json -Depth 100

# Save JSON without BOM
$json | Out-File -FilePath $OutputFile -Encoding ascii

Write-Host "Permissions saved to $OutputFile"
```


This is where I got the decimal values for ACL permissions from:

```powershell
[System.Enum]::GetValues([System.Security.AccessControl.FileSystemRights]) | ForEach-Object {
    [PSCustomObject]@{
        Name = $_
        Value = [int]$_
    }
} | Format-Table -AutoSize
```

The result is:

```PowerShell
                    ReadData       1
                    ReadData       1
                 CreateFiles       2
                 CreateFiles       2
                  AppendData       4
                  AppendData       4
      ReadExtendedAttributes       8
     WriteExtendedAttributes      16
                 ExecuteFile      32
                 ExecuteFile      32
DeleteSubdirectoriesAndFiles      64
              ReadAttributes     128
             WriteAttributes     256
                       Write     278
                      Delete   65536
             ReadPermissions  131072
                        Read  131209
              ReadAndExecute  131241
                      Modify  197055
           ChangePermissions  262144
               TakeOwnership  524288
                 Synchronize 1048576
                 FullControl 2032127
```

where each decimal represents a 32-bit binary integer.

## ACL Permissions Table

| Permission                     | Decimal Value | Binary Value               |
|--------------------------------|---------------|----------------------------|
| ReadData                       | 1             | 0000 0000 0000 0000 0000 0000 0000 0001 |
| CreateFiles                    | 2             | 0000 0000 0000 0000 0000 0000 0000 0010 |
| AppendData                     | 4             | 0000 0000 0000 0000 0000 0000 0000 0100 |
| ReadExtendedAttributes         | 8             | 0000 0000 0000 0000 0000 0000 0000 1000 |
| WriteExtendedAttributes        | 16            | 0000 0000 0000 0000 0000 0000 0001 0000 |
| ExecuteFile                    | 32            | 0000 0000 0000 0000 0000 0000 0010 0000 |
| DeleteSubdirectoriesAndFiles   | 64            | 0000 0000 0000 0000 0000 0000 0100 0000 |
| ReadAttributes                 | 128           | 0000 0000 0000 0000 0000 0000 1000 0000 |
| WriteAttributes                | 256           | 0000 0000 0000 0000 0000 0001 0000 0000 |
| Write                          | 278           | 0000 0000 0000 0000 0000 0001 0001 0110 |
| Delete                         | 65536         | 0000 0000 0000 0001 0000 0000 0000 0000 |
| ReadPermissions                | 131072        | 0000 0000 0000 0010 0000 0000 0000 0000 |
| Read                           | 131209        | 0000 0000 0000 0010 0000 0000 1000 1001 |
| ReadAndExecute                 | 131241        | 0000 0000 0000 0010 0000 0000 1010 0001 |
| Modify                         | 197055        | 0000 0000 0000 0011 0000 1000 1011 0111 |
| ChangePermissions              | 262144        | 0000 0000 0000 0100 0000 0000 0000 0000 |
| TakeOwnership                  | 524288        | 0000 0000 0000 1000 0000 0000 0000 0000 |
| Synchronize                    | 1048576       | 0000 0000 0001 0000 0000 0000 0000 0000 |
| FullControl                    | 2032127       | 0000 0000 0001 1111 1111 1111 1111 1111 |



## Understanding Bitwise Permissions
Bitwise permissions allow for efficient storage and manipulation of permissions using binary arithmetic. Each permission is represented by a specific bit in an integer, allowing multiple permissions to be combined into a single value. Here's a breakdown of the bitwise permissions used in the PowerShell script:

* ReadData (2^0): Allows reading of file data.
* CreateFiles (2^1): Allows creating files in a directory.
* AppendData (2^2): Allows appending data to a file.
* ReadExtendedAttributes (2^3): Allows reading extended file attributes.
* WriteExtendedAttributes (2^4): Allows writing extended file attributes.
* ExecuteFile (2^5): Allows executing a file.
* DeleteSubfoldersAndFiles (2^6): Allows deleting subfolders and files.
* ReadAttributes (2^7): Allows reading file attributes.
* WriteAttributes (2^8): Allows writing file attributes.
* Delete (2^16): Allows deleting a file or folder.
* ReadPermissions (2^17): Allows reading file or folder permissions.
* ChangePermissions (2^18): Allows changing file or folder permissions.
* TakeOwnership (2^19): Allows taking ownership of a file or folder.
* Synchronize (2^20): Synchronizes access to a file or folder.

These permissions are combined using bitwise OR operations and can be checked using bitwise AND operations, allowing for efficient permission management.

## Combined Permissions Breakdown

### Write (278)
The `Write` permission is a combination of the following:
- WriteData (2^1) = 2
- AppendData (2^2) = 4
- WriteExtendedAttributes (2^4) = 16
- WriteAttributes (2^8) = 256

Combining these with bitwise OR:
\[ 2 \, | \, 4 \, | \, 16 \, | \, 256 = 278 \]

### Read (131209)
The `Read` permission is a combination of the following:
- ReadData (2^0) = 1
- ReadExtendedAttributes (2^3) = 8
- ReadAttributes (2^7) = 128
- ReadPermissions (2^17) = 131072

Combining these with bitwise OR:
\[ 1 \, | \, 8 \, | \, 128 \, | \, 131072 = 131209 \]

### ReadAndExecute (131241)
The `ReadAndExecute` permission is a combination of `Read` and `ExecuteFile`:
- Read (131209)
- ExecuteFile (2^5) = 32

Combining these with bitwise OR:
\[ 131209 \, | \, 32 = 131241 \]

### Modify (197055)
The `Modify` permission is a combination of `ReadAndExecute`, `Write`, and `Delete`:
- ReadAndExecute (131241)
- Write (278)
- Delete (2^16) = 65536

Combining these with bitwise OR:
\[ 131241 \, | \, 278 \, | \, 65536 = 197055 \]

### FullControl (2032127)
The `FullControl` permission includes all possible permissions:
- ReadData (2^0) = 1
- CreateFiles (2^1) = 2
- AppendData (2^2) = 4
- ReadExtendedAttributes (2^3) = 8
- WriteExtendedAttributes (2^4) = 16
- ExecuteFile (2^5) = 32
- DeleteSubdirectoriesAndFiles (2^6) = 64
- ReadAttributes (2^7) = 128
- WriteAttributes (2^8) = 256
- Delete (2^16) = 65536
- ReadPermissions (2^17) = 131072
- ChangePermissions (2^18) = 262144
- TakeOwnership (2^19) = 524288
- Synchronize (2^20) = 1048576

Combining these with bitwise OR:
\[ 1 \, | \, 2 \, | \, 4 \, | \, 8 \, | \, 16 \, | \, 32 \, | \, 64 \, | \, 128 \, | \, 256 \, | \, 65536 \, | \, 131072 \, | \, 262144 \, | \, 524288 \, | \, 1048576 = 2032127 \]

## Visualizing Permissions with Python and Plotly

Once the permissions have been exported to a JSON file, we can use Python and Plotly to visualize this data. Plotly is a powerful visualization library that allows for the creation of interactive plots and charts.

The following Python script reads the JSON file generated by the PowerShell script and creates a treemap visualization of the folder permissions. The script uses Plotly's go.Treemap to create the treemap and applies a default theme for better aesthetics. [Other themes can be found here.](https://plotly.com/python/templates/)


```python
import os
import json
import plotly.graph_objects as go

# Function to replace backslashes in the username
def replace_backslashes(username):
    return username.replace('\\', '_')

# Function to create the folder structure visualization for each user
def create_user_visualization(user_permissions, user_name, permission_types, output_dir):
    access_control_type = {0: "Allow", 1: "Deny"}
    inheritance_flags = {0: "None", 1: "ContainerInherit", 2: "ObjectInherit", 3: "ContainerInherit + ObjectInherit"}
    propagation_flags = {0: "None", 1: "InheritOnly", 2: "NoPropagateInherit"}
    
    figs = {}
    theme = "seaborn"  # Choose the theme you want to apply
    
    for permission_type in permission_types:
        labels = []
        parents = []
        texts = []
        display_labels = {}  # Map original labels to display labels

        for path, permissions in user_permissions.items():
            if permissions.get(permission_type, 0) != 0:  # Only include paths with the specified permission type
                parts = path.split('\\')
                for i in range(len(parts)):
                    original_label = '\\'.join(parts[:i+1])
                    display_label = parts[i]
                    
                    if i > 0:
                        display_label = '.\\' + display_label  # Prefix with .\ if it has a parent node
                    if i < len(parts) - 1:
                        display_label += '\\'  # Append \ if it has a child node
                    
                    display_labels[original_label] = display_label
                    
                    if display_label not in labels:
                        labels.append(display_label)
                        if i == 0:
                            parents.append("")
                        else:
                            parent_label = '\\'.join(parts[:i])
                            parent_display_label = display_labels[parent_label]
                            parents.append(parent_display_label)
                        
                        access_control_type_value = permissions.get('AccessControlType', 'Unknown')
                        inheritance_flags_value = permissions.get('InheritanceFlags', 'Unknown')
                        propagation_flags_value = permissions.get('PropagationFlags', 'Unknown')
                        is_inherited = permissions.get('IsInherited', 'Unknown')
                        bitwise_permissions_decimal = permissions.get('BitwisePermissionsDecimal', 'Unknown')
                        bitwise_permissions_binary = permissions.get('BitWisePermissionsBinary', 'Unknown').lstrip('0')

                        texts.append(
                            f"AccessControlType: {access_control_type.get(access_control_type_value, 'Unknown')}<br>"
                            f"InheritanceFlags: {inheritance_flags.get(inheritance_flags_value, 'Unknown')}<br>"
                            f"PropagationFlags: {propagation_flags.get(propagation_flags_value, 'Unknown')}<br>"
                            f"IsInherited: {is_inherited}<br>"
                            f"BitwisePermissions (Decimal): {bitwise_permissions_decimal}<br>"
                            f"BitwisePermissions (Binary): {bitwise_permissions_binary}"
                        )

        if not labels:
            continue

        fig = go.Figure(go.Treemap(
            labels=labels,
            parents=parents,
            text=texts,
            hoverinfo="label+text"
        ))

        fig.update_layout(title_text=f"{permission_type} Permissions for {user_name}", template=theme)
        figs[permission_type] = fig
    
    # Create a dropdown menu to select graphs
    dropdown_buttons = [
        {'label': perm, 'method': 'update', 'args': [{'visible': [perm == p for p in permission_types]}, {'title': f"{perm} Permissions for {user_name}"}]}
        for perm in permission_types
    ]

    if figs:
        final_fig = go.Figure()
        for perm in permission_types:
            if perm in figs:
                final_fig.add_traces(figs[perm].data)
                final_fig.update_traces(visible=False)
        final_fig.data[0].visible = True

        final_fig.update_layout(
            updatemenus=[
                {
                    'buttons': dropdown_buttons,
                    'direction': 'down',
                    'showactive': True,
                }
            ],
            title_text=f"Permissions for {user_name}",
            template=theme
        )

        os.makedirs(output_dir, exist_ok=True)
        sanitized_user_name = replace_backslashes(user_name)
        final_fig.write_html(os.path.join(output_dir, f"{sanitized_user_name}.html"))

# Main function to process the JSON data and generate visualizations
def main():
    input_file = 'permissions.json'
    output_dir = 'folder_permissions_treemap'
    
    # Load the JSON data
    with open(input_file, 'r') as file:
        data = json.load(file)

    # Extract permission types
    sample_permission = data[0]['Permissions'][0]['BitWisePermissions']
    permission_types = list(sample_permission.keys())

    # Process the data to group permissions by user
    user_permissions = {}
    for entry in data:
        path = entry['Path']
        for permission in entry['Permissions']:
            user = permission['IdentityReference']['Value']
            if user not in user_permissions:
                user_permissions[user] = {}
            user_permissions[user][path] = permission['BitWisePermissions']
            user_permissions[user][path].update({
                'AccessControlType': permission['AccessControlType'],
                'InheritanceFlags': permission['InheritanceFlags'],
                'PropagationFlags': permission['PropagationFlags'],
                'IsInherited': permission['IsInherited'],
                'BitwisePermissionsDecimal': permission.get('BitwisePermissionsDecimal', 'Unknown'),
                'BitWisePermissionsBinary': permission.get('BitWisePermissionsBinary', 'Unknown')
            })

    # Create visualizations for each user
    total_users = len(user_permissions)
    for idx, (user, permissions) in enumerate(user_permissions.items(), start=1):
        print(f"Processing user {idx} of {total_users}: {user}")
        create_user_visualization(permissions, user, permission_types, output_dir)
        print(f"Finished processing user {idx} of {total_users}: {user}")

if __name__ == "__main__":
    main()

```

This approach provides a clear and structured method for administrators to audit and visualize folder permissions in their environment.