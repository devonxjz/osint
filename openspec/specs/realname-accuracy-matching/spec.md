# Capability: Realname Accuracy Matching

## Purpose
TBD: This capability defines requirements for real-name identity resolution scans, covering multi-signal scoring, Levenshtein matching, positional variants, cross-platform correlation, and budget-aware streaming timeout management.

## Requirements

### Requirement: Partial and Positional Variant Generation
The system SHALL generate both default variants and partial/positional username variants when performing a real name search.

#### Scenario: Variant generation for a two-word name
- **WHEN** the name "David Bomber" is analyzed with deep scan disabled
- **THEN** the system generates the exact variants: "davidbomber", "david_bomber", "david.bomber", and "dbomber"

#### Scenario: Variant generation for a two-word name in deep scan
- **WHEN** the name "David Bomber" is analyzed with deep scan enabled
- **THEN** the system generates the exact and partial/positional variants: "davidbomber", "david_bomber", "david.bomber", "dbomber", "david", "bomber", "d_bomber", "davidb", "bomber_david", "bomber.david", "bomber_d", "bdavid"

### Requirement: Multi-Signal Profile Matching and Scoring
The system SHALL verify profile matches by calculating a confidence score from display name fuzzy matching, bio tokens, username tokens, and avatar URL match.

#### Scenario: Full display name and bio token match
- **WHEN** a profile is found with display name "David Bomber" and bio "Senior Dev, david bomber fan", and the target search name is "David Bomber"
- **THEN** the display name fuzzy match similarity is 1.0 (adds 40 points), the bio contains both "david" and "bomber" tokens (adds 30 points), resulting in a score of 70 (HIGH confidence)

### Requirement: Cross-Platform Avatar URL Correlation
The system SHALL compare avatar URLs pairwise across all found profiles and apply a confidence boost if matches are detected.

#### Scenario: Pairwise avatar URL match
- **WHEN** GitHub and Medium profiles both share the same normalized avatar URL
- **THEN** the system applies a +35 point bonus to the confidence score of both profiles

### Requirement: Dynamic Streaming Timeout Budget
The system SHALL monitor the elapsed execution time and gracefully terminate or skip stages to prevent exceeding a 9500ms timeout budget, while streaming results and verified events in chunked intervals.

#### Scenario: Execution exceeds budget before deep scan
- **WHEN** the elapsed time of exact variant scanning reaches 7500ms and deep scan is requested
- **THEN** the system skips the partial variant deep scan phase, emits all currently verified results, and ends the SSE stream safely

### Requirement: Low Confidence Visual Cue
The frontend dashboard SHALL visually distinguish profiles graded with LOW confidence.

#### Scenario: Displaying a low confidence profile
- **WHEN** a profile has a confidence score of less than 40
- **THEN** the card is rendered with a dashed border, desaturated avatar, and displays a "Potential Username Collision" warning badge
