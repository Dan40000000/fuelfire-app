#!/bin/bash

echo "FuelFire App - Backup Restore Tool"
echo "=================================="
echo ""
echo "Available backups:"
echo "1) v1.0 - First working version (organized code)"
echo ""
echo "WARNING: This will restore your app to a previous version!"
echo "Current work will be saved in a branch called 'before-restore-[date]'"
echo ""
read -p "Enter the version to restore (e.g., v1.0) or 'cancel' to exit: " version

if [ "$version" = "cancel" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create a backup of current state
backup_branch="before-restore-$(date +%Y%m%d-%H%M%S)"
git branch $backup_branch
echo "✓ Current state backed up to branch: $backup_branch"

# Restore the selected version
git checkout $version
echo "✓ Restored to version: $version"
echo ""
echo "To go back to your latest work, run: git checkout $backup_branch"
echo "To continue from this version, run: git checkout -b new-feature-branch"