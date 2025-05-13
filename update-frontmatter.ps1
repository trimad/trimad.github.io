$postsDir = "content\posts"

# Get all markdown files in posts directory
$posts = Get-ChildItem -Path $postsDir -Recurse -Filter "*.md"

foreach ($post in $posts) {
    Write-Host "Processing: $($post.FullName)"
    
    # Read the file content
    $content = Get-Content $post.FullName -Raw
    
    # Extract front matter
    if ($content -match "^---\s*(.*?)\s*---") {
        $frontMatter = $matches[1]
        
        # Split front matter into lines
        $lines = $frontMatter -split "`n"
        
        # Create a dictionary to store the fields
        $fields = @{ }
        
        # Process each line
        foreach ($line in $lines) {
            if ($line -match "^(.*?):\s*(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                if (-not $fields.ContainsKey($key)) {
                    $fields[$key] = $value
                }
            }
        }

        # Remove unwanted fields
        $fields.Remove("lastmod")
        $fields.Remove("thumbnail")
        $fields.Remove("featured")

        # Ensure required fields exist with default values
        $requiredFields = @{
            "author" = "Tristan Madden"
            "categories" = "[]"
            "date" = ""
            "draft" = "false"
            "summary" = ""
            "tags" = "[]"
            "title" = ""
            "toc" = "true"
            "usePageBundles" = "true"
        }

        # Add missing required fields
        foreach ($field in $requiredFields.Keys) {
            if (-not $fields.ContainsKey($field)) {
                $fields[$field] = $requiredFields[$field]
            }
        }

        # Build new front matter
        $newFrontMatter = ""
        foreach ($key in $fields.Keys | Sort-Object) {
            $newFrontMatter += $key + ': ' + $fields[$key] + "`n"
        }
        
        # Rebuild the file with updated front matter
        $newContent = "---`n$newFrontMatter`n---`n" + $content.Substring($matches[0].Length)
        
        # Write the updated content
        Write-Host "Updating: $($post.FullName)"
        $tempFile = [System.IO.Path]::GetTempFileName()
        $newContent | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        
        # Backup original file before updating
        $backupFile = $post.FullName + ".bak"
        Copy-Item -Path $post.FullName -Destination $backupFile -Force
        
        # Replace original file with updated content
        Move-Item -Path $tempFile -Destination $post.FullName -Force
    }
}
    }
}
