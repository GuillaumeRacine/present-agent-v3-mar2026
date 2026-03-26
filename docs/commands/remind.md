# Gift Reminders

Check upcoming occasions from Google Calendar and Contacts. Shows who has birthdays, anniversaries, or events coming up so you never miss a gift opportunity.

## Usage
/remind
/remind next 30 days

## Instructions

Scan Google Calendar and Contacts for upcoming gift-worthy occasions.

$BASH
cd /Users/gui/Downloads/present-agent-v2

# Check if occasions API is running
if curl -s http://localhost:3000/api/occasions 2>/dev/null | head -1 | grep -q "occasions"; then
  curl -s "http://localhost:3000/api/occasions?days=30" 2>/dev/null
else
  # Fallback: check contacts birthdays directly
  echo "App not running. Checking calendar via script..."
  python3 /Users/gui/Obs_Vault/_System/Claude_Code/Scripts/calendar_reader.py --days 30 2>/dev/null || echo "Calendar script not available"
fi
$ENDBASH

Present the results as:

## Upcoming Gift Occasions

| When | Who | What | Days Away |
|------|-----|------|-----------|
| [date] | [name] | [occasion] | [N days] |

For any occasion within 14 days, suggest: "Want me to find a gift? Run `/gift`"
For any within 3 days, flag as urgent: "This is coming up fast — I can find a last-minute gift."
