# FuelFire App - Backup Guide

## Current Backups

- **v1.0** - First working version with organized code structure
- **v1.1** - Added complete quick workout pages (30-min muscle, 20-min HIIT, 15-min mobility, 10-min core)
- **backup/working-version-1** - Branch backup of v1.0
- **backup/working-version-2-quick-workouts** - Branch backup of v1.1 with quick workouts

## How to Create a New Backup

Before making major changes, run:
```bash
git tag -a v1.1 -m "Description of what's working"
git push origin v1.1
```

## How to Restore a Backup

### Option 1: Use the restore script
```bash
./restore-backup.sh
```

### Option 2: Manual restore
```bash
# See all versions
git tag

# Restore to a specific version
git checkout v1.0

# Create a new branch from that version
git checkout -b fixed-version
```

## Best Practices

1. **Before big changes**: Create a tag (e.g., v1.1, v1.2)
2. **Daily backups**: Commit and push regularly
3. **Test first**: Make changes in a new branch
4. **Document**: Note what each version includes

## Emergency Commands

If something breaks:
```bash
# Go back to last working version
git checkout v1.0

# See what changed
git diff v1.0 main

# Reset everything (CAREFUL!)
git reset --hard v1.0
```