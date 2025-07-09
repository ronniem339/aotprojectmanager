Material 3 Expressive: A Style Guide for Responsive Web Application Development
1.0 Introduction: The Philosophy of Expressive Design
1.1 Purpose of This Guide
This document provides the canonical style and implementation rules for building web applications that strictly conform to the Google Material 3 (M3) Expressive design language. It is structured as a definitive technical specification intended for use by an automated AI development tool. The purpose of this guide is to translate the nuanced design philosophy of M3 Expressive into a structured, token-based system, ensuring the consistent and accurate generation of responsive user interfaces across all specified platforms: desktop, tablet (portrait and landscape), and mobile. Adherence to the rules, tokens, and values within this document is mandatory for achieving a compliant M3 Expressive user experience.

1.2 Core Tenets: Emotion, Usability, and Personality
Material 3 Expressive is a significant evolution of the Material 3 design system. It was developed to meet user demand for digital experiences that are not only functional but also modern, engaging, and emotionally resonant. The system moves beyond the foundational goal of consistency to infuse user interfaces with a distinct personality and feeling, making them more human and relatable.   

This expressiveness is not achieved through arbitrary decoration but through a series of research-backed enhancements to the core systems of color, shape, typography, and motion. Extensive user research, involving 46 studies with over 18,000 participants, underpins this evolution, demonstrating that users of all ages strongly prefer expressive designs. These studies found that expressive interfaces are perceived as more modern and relevant, and, critically, are easier to use. Key interactive elements, such as a primary "Send" button, were located up to four times faster in expressive layouts compared to their non-expressive counterparts, highlighting that expressiveness is a tool for enhancing usability.   

The ultimate goal is to create interfaces that feel like a natural extension of the user. This is accomplished through adaptive features like dynamic color, which allows the UI to personalize itself based on user context, such as a brand color or other inputs, fostering a deeper connection between the user and the product.   

1.3 The Seven Expressive Tactics
The application of the M3 Expressive design system is guided by seven high-level strategies, or tactics. These tactics should serve as the guiding heuristics for the AI's layout, composition, and styling decisions, ensuring that expressiveness is applied with clear intent and purpose.   

Use a variety of shapes: Shape is a powerful communication tool. By combining different corner radii from the shape scale and leveraging the expanded library of abstract shapes, the UI can create visual tension or cohesion. This contrast between rounded and sharp forms helps direct the user's focus to key elements and establishes a unique visual tone.   

Apply rich and nuanced colors: The dynamic color system provides a wide range of tonal palettes for primary, secondary, and tertiary accents, as well as surfaces. The strategic mixing of these color roles is essential for establishing a clear visual hierarchy, emphasizing the main takeaway of a screen, and prioritizing actions to simplify navigation.   

Guide attention with typography: The introduction of "Emphasized" type styles allows for the creation of editorial-like moments within the UI. Using heavier weights, larger sizes, and distinct colors for headlines and key information directs user attention and makes critical content more engaging and legible.   

Contain content for emphasis: Logically related content and actions should be grouped within containers, such as Cards. Giving the most important tasks or information visual prominence through ample spacing and the brightest surface color mapping makes the UI more scannable and intuitive.   

Add fluid and natural motion: The new physics-based motion system makes interactions feel alive, spirited, and responsive. Applying expressive motion springs and shape-morphing effects to component transitions and user feedback adds moments of delight and improves comprehension.   

Leverage component flexibility: The UI must adapt to the user's context. Components should shift or change their layout to make tasks easier, particularly on large and foldable screens where more space is available. This includes using expressive variants of app bars, toolbars, and buttons.   

Combine tactics to create "Hero Moments": For the most critical interactions in the application, multiple expressive tactics should be combined to create a "hero moment." These moments break from predictable design patterns to frame essential information in a fresh, delightful, and memorable way. They serve as a powerful focusing mechanism. Hero moments must be used sparingly—no more than one or two per product—to maintain their impact and avoid overwhelming the user.   

1.4 Guiding Principles for Implementation
The M3 Expressive system is an expansion of M3, not a replacement. It introduces new features like the physics-based motion system, an emphasized type scale, and an expanded shape library, while also providing expressive updates to existing components. Therefore, the AI's implementation logic must be structured to first understand and apply baseline M3 principles and then layer the Expressive modifications and additions as a superset of rules.   

The primary driver of M3 Expressive is to improve usability by guiding user attention. The expressiveness is a functional tool, not merely a decorative one. The research linking expressive design to improved usability metrics, such as faster target acquisition, underscores this point. The tactics of using richer color, bolder typography, and varied shapes are all framed in terms of "guiding attention," "emphasizing key information," and "creating hierarchy". Consequently, the AI must prioritize the application of expressive styles to interactive elements (e.g., buttons, calls-to-action) and primary information (e.g., headlines) to achieve this functional goal, rather than applying them uniformly across the entire interface.   

2.0 Foundational Systems: The Building Blocks of the UI
2.1 Color System
The M3 Expressive color system is designed to be personal, adaptive, and accessible. It is built upon a foundation of dynamic color generation, tonal palettes, and a semantic role-based token system.   

2.1.1 Dynamic Color and Tonal Palettes
The system's core is dynamic color, a methodology where a full, accessible color scheme is algorithmically generated from a single source color. While on Android this source is often the user's wallpaper, for web applications, this source color shall be a predefined brand color.   

The generation algorithm produces five key color palettes: Primary, Secondary, Tertiary, Neutral, and Neutral Variant. Each of these key colors is then expanded into a    

tonal palette, which is a sequence of 13 tones of that color. These tones are indexed from 0 (representing black) to 100 (representing white). This architecture provides a rich and nuanced spectrum of colors while ensuring that accessible contrast relationships are systematically maintained between different UI elements.   

2.1.2 Color Roles and Token Naming Convention
Application of color is governed by a set of over 26 semantic color roles, which are mapped to specific UI components and elements. These roles are the single source of truth for all color application.    

The use of hard-coded hex values is strictly forbidden. All colors must be applied via their designated system token.

The token naming convention follows a clear, hierarchical structure: md.sys.color.[role].

Base Roles: Examples include md.sys.color.primary, md.sys.color.secondary, and md.sys.color.surface.

"On" Roles: The on- prefix (e.g., md.sys.color.on-primary) designates a color for content, such as text and icons, that is placed on top of its corresponding base role (primary). The system guarantees that on- colors have an accessible contrast ratio against their base.   

"Container" Roles: The -container suffix (e.g., md.sys.color.primary-container) denotes a container color that typically has less emphasis than the main accent color. It is paired with its own on- role (md.sys.color.on-primary-container) for its content.   

2.1.3 Light and Dark Theme Implementation
The token system has built-in, first-class support for both light and dark themes. The same system token, for instance    

md.sys.color.surface, will automatically resolve to a different reference color value depending on whether the light or dark theme is active. The AI must generate CSS variables for both light and dark theme contexts and apply the appropriate set based on user preference or system settings.

M3 Expressive introduces tone-based surface colors, which replace the elevation-based overlay system of M2. These roles (surface, surface-dim, surface-bright, surface-container-lowest, surface-container-low, surface-container, surface-container-high, surface-container-highest) are not tied to a specific elevation level, offering greater flexibility and supporting features like user-controlled contrast.   

The use of tonal palettes is a fundamental shift from previous Material versions. Instead of a limited set of hand-picked variants, M3 generates extensive palettes and algorithmically pairs tones for roles like primary and on-primary to guarantee minimum contrast ratios. This systematic approach means the AI does not need to perform a separate contrast check for standard component and color role pairings; the system's structure inherently enforces accessibility, simplifying development and ensuring a baseline of usability.   

2.1.4 Table: M3 Core Color Role Tokens (Baseline Light and Dark Themes)
This table provides the mapping of semantic color roles to their token names and default baseline hex values. This is the foundational data for generating the application's CSS color variables.

Role Name

Token ID

Light Theme Value

Dark Theme Value

Description/Usage

Primary

md.sys.color.primary

#6750A4

#D0BCFF

The primary accent color for key components like filled buttons and active states.

On Primary

md.sys.color.on-primary

#FFFFFF

#381E72

Color for text and icons on a primary background.

Primary Container

md.sys.color.primary-container

#EADDFF

#4F378B

A less emphasized container color using the primary accent.

On Primary Container

md.sys.color.on-primary-container

#21005D

#EADDFF

Color for text and icons on a primary-container background.

Secondary

md.sys.color.secondary

#625B71

#CCC2DC

The secondary accent color for less prominent components like filter chips.

On Secondary

md.sys.color.on-secondary

#FFFFFF

#332D41

Color for text and icons on a secondary background.

Secondary Container

md.sys.color.secondary-container

#E8DEF8

#4A4458

A less emphasized container color using the secondary accent.

On Secondary Container

md.sys.color.on-secondary-container

#1D192B

#E8DEF8

Color for text and icons on a secondary-container background.

Tertiary

md.sys.color.tertiary

#7D5260

#EFB8C8

The tertiary accent color for contrasting accents and decorative elements.

On Tertiary

md.sys.color.on-tertiary

#FFFFFF

#492532

Color for text and icons on a tertiary background.

Tertiary Container

md.sys.color.tertiary-container

#FFD8E4

#633B48

A less emphasized container color using the tertiary accent.

On Tertiary Container

md.sys.color.on-tertiary-container

#31111D

#FFD8E4

Color for text and icons on a tertiary-container background.

Error

md.sys.color.error

#B3261E

#F2B8B5

Color for indicating errors in components like text fields.

On Error

md.sys.color.on-error

#FFFFFF

#601410

Color for text and icons on an error background.

Error Container

md.sys.color.error-container

#F9DEDC

#8C1D18

A less emphasized container for error-related information.

On Error Container

md.sys.color.on-error-container

#410E0B

#F9DEDC

Color for text and icons on an error-container background.

Background

md.sys.color.background

#FFFBFE

#1C1B1F

The overall background color of the application.

On Background

md.sys.color.on-background

#1C1B1F

#E6E1E5

Color for text and icons on the main background.

Surface

md.sys.color.surface

#FFFBFE

#1C1B1F

The color of component surfaces like cards and menus.

On Surface

md.sys.color.on-surface

#1C1B1F

#E6E1E5

Default color for text and icons on any surface.

Surface Variant

md.sys.color.surface-variant

#E7E0EC

#49454F

A variant surface color for subtle differentiation.

On Surface Variant

md.sys.color.on-surface-variant

#49454F

#CAC4D0

Color for text and icons on a surface-variant background.

Outline

md.sys.color.outline

#79747E

#938F99

Color for component outlines, like in outlined buttons or text fields.

Outline Variant

md.sys.color.outline-variant

#C4C6C9

#444746

A subtler outline color, used for decorative dividers.

Shadow

md.sys.color.shadow

#000000

#000000

Color for casting shadows from elevated surfaces.

Surface Tint

md.sys.color.surface-tint

#6750A4

#D0BCFF

A tint color applied to elevated surfaces, typically matching the primary color.


Export to Sheets
   

2.2 Typography System
The M3 Expressive typography system is designed for clarity, hierarchy, and personality. It is built around a dual type scale, the use of variable fonts, and a clear set of semantic roles.

2.2.1 Dual Type Scale: Baseline and Emphasized
The M3 type scale is composed of two parallel sets of 15 styles each: Baseline and Emphasized.   

Baseline Styles: These are the default styles intended for all standard UI text, providing a clear and readable foundation for the application's content.

Emphasized Styles: Introduced as a key feature of M3 Expressive, these styles have a higher font weight and other minor typographic adjustments. They are specifically designed for use in "hero moments," prominent headlines, and to indicate selected states. Their purpose is to draw user attention, create strong visual hierarchy, and add personality to the interface without requiring custom, one-off styles.   

The existence of a formal "Emphasized" scale provides a systematic way to apply visual prominence. Instead of arbitrarily bolding text, the system provides a complete, parallel set of styles. The rule for the AI becomes: "For the primary headline of a hero element, use the headline-large-emphasized style token instead of the baseline headline-large token." This makes expressiveness a predictable, token-based choice.

2.2.2 Variable Fonts: Roboto Flex
The system is optimized for and recommends the use of variable fonts, with Roboto Flex as the default typeface. Variable fonts are critical to M3 Expressive as they allow for fine-grained, dynamic control over multiple font axes from a single font file. The key adjustable axes include :   

Weight (wght): Controls the stroke thickness, from thin to bold.

Width (wdth): Controls the horizontal space each character occupies.

Grade (GRAD): Adjusts the font's thickness without changing its width, useful for visual correction and maintaining readability in different contexts (e.g., light text on a dark background).

A core expressive tactic is to use these variable font axes for motion feedback. For example, the font weight of a button's label can be dynamically increased on press to provide a subtle, tactile response. While more decorative or script-style fonts can be considered for the    

Display and Headline roles, the default for all other roles must be a highly readable sans-serif typeface like Roboto to ensure legibility, especially in body copy.   

2.2.3 Applying Type Roles
The type scale is organized into five semantic roles, each available in three sizes (Large, Medium, and Small), creating a 15-style scale that is mirrored for both Baseline and Emphasized sets.   

Display: Reserved for short, high-impact text or numerals. Best suited for large screens.

Headline: For high-emphasis text, serving as the primary heading for sections of content.

Title: For medium-emphasis text, such as the titles of components (e.g., cards, dialogs).

Body: Intended for long-form text. Must prioritize readability with comfortable line height and letter spacing.

Label: For functional text in components like buttons, navigation items, and captions.

Each of the 30 total styles is represented by a unique token. For example, the token for the large body style is md.sys.typescale.body-large, while its emphasized counterpart is md.sys.typescale.body-large-emphasized.

2.2.4 Table: M3 Complete Type Scale (Baseline and Emphasized)
This table is the definitive reference for all text styling. The AI shall use it to generate the CSS classes for every typographic style used in the application. All sizes are specified in sp (scalable pixels) for native Android but should be implemented using rem units on the web for scalability and accessibility, with a base font size of 16px. Line heights are unitless ratios.

Style Name

Token ID

Font Family

Font Weight

Font Size (sp/rem)

Line Height (sp/rem)

Letter Spacing (sp)

Display Large

display-large

Roboto

400 (Regular)

57 / 3.5625

64 / 4

-0.25

Display Medium

display-medium

Roboto

400 (Regular)

45 / 2.8125

52 / 3.25

0

Display Small

display-small

Roboto

400 (Regular)

36 / 2.25

44 / 2.75

0

Headline Large

headline-large

Roboto

400 (Regular)

32 / 2

40 / 2.5

0

Headline Medium

headline-medium

Roboto

400 (Regular)

28 / 1.75

36 / 2.25

0

Headline Small

headline-small

Roboto

400 (Regular)

24 / 1.5

32 / 2

0

Title Large

title-large

Roboto

400 (Regular)

22 / 1.375

28 / 1.75

0

Title Medium

title-medium

Roboto

500 (Medium)

16 / 1

24 / 1.5

0.15

Title Small

title-small

Roboto

500 (Medium)

14 / 0.875

20 / 1.25

0.1

Body Large

body-large

Roboto

400 (Regular)

16 / 1

24 / 1.5

0.5

Body Medium

body-medium

Roboto

400 (Regular)

14 / 0.875

20 / 1.25

0.25

Body Small

body-small

Roboto

400 (Regular)

12 / 0.75

16 / 1

0.4

Label Large

label-large

Roboto

500 (Medium)

14 / 0.875

20 / 1.25

0.1

Label Medium

label-medium

Roboto

500 (Medium)

12 / 0.75

16 / 1

0.5

Label Small

label-small

Roboto

500 (Medium)

11 / 0.6875

16 / 1

0.5


Export to Sheets
Note: The Emphasized scale uses the same size, line height, and letter spacing values but with a heavier font weight (e.g., 500 or 700, depending on the role). The AI must implement a parallel set of classes for these styles.

   

2.3 Shape System
The M3 Expressive shape system moves beyond simple container styling to become an active part of the interaction model, providing visual feedback, creating hierarchy, and expressing brand personality.

2.3.1 Corner Radius Scale
The foundation of the shape system is a scale of corner radius values, which allows for consistent application of roundedness across all components. The M3 Expressive update expanded this scale with larger values to enable more dramatic and expressive shapes. All shape applications must use these tokens, not hard-coded    

border-radius values.

2.3.2 Table: M3 Shape Corner Radius Tokens
This table provides the specific dp values for each semantic corner radius token, which the AI will use to generate the correct CSS border-radius properties.

Scale Level

Token ID

Value (dp)

None

md.sys.shape.corner.none

0

Extra Small

md.sys.shape.corner.extra-small

4

Small

md.sys.shape.corner.small

8

Medium

md.sys.shape.corner.medium

12

Large

md.sys.shape.corner.large

20

Extra Large

md.sys.shape.corner.extra-large

32

Extra Extra Large

md.sys.shape.corner.extra-extra-large

48

Full

md.sys.shape.corner.full

50% (Circular)


Export to Sheets
   

2.3.3 Shape Families and Application
M3 Expressive introduces an expanded library of 35 abstract shapes (e.g., MaterialShapes.SoftBurst, MaterialShapes.Cookie9Sided) that are primarily used for decorative flair and in specific components like the LoadingIndicator.   

The core principle of shape application is to create either harmony or tension.

Harmony is achieved by consistently using similar shapes and corner radii across a screen, creating a cohesive and calm feel.

Tension is created by intentionally contrasting shapes—for example, placing a sharp-cornered element next to a fully rounded one. This visual contrast is a powerful tool for drawing the user's attention to a specific element.   

Abstract shapes must be used sparingly. They are best suited for non-interactive, decorative moments (e.g., image cropping, avatars) or in components designed to be highly expressive (e.g., loaders). They should be avoided for core functional containers where their unusual forms could add visual clutter and detract from usability.   

2.3.4 Shape Morphing
A key interactive feature of M3 Expressive is shape morphing, the ability for components to smoothly animate and transition between different shapes to communicate a change in state. This makes shape an active part of the interaction model rather than a static property.   

This behavior is used by default in several new and updated components:

Button Groups: Buttons within a group can change shape when pressed, creating an animation that appears to "bump" into adjacent buttons.   

Icon Buttons: Can be configured to morph from one shape (e.g., square) to another (e.g., circle) when selected.   

Loading Indicator: The expressive LoadingIndicator component continuously morphs between a series of abstract shapes to show that a process is active.   

All shape morphing animations are powered by the Expressive motion scheme by default, ensuring they feel fluid and natural. The AI's component logic must therefore not only assign a static shape but also define shape transitions tied to specific interaction states (e.g.,    

on:pressed, transition border-radius from var(--md-sys-shape-corner-medium) to var(--md-sys-shape-corner-full)).

2.4 Motion System
M3 Expressive completely revamps motion design, moving from a static, duration-based system to a dynamic, physics-based system that makes interactions feel more natural, responsive, and alive.   

2.4.1 Physics-Based Animation: Springs
All motion in M3 Expressive is powered by a spring physics system. Instead of defining a fixed duration and an easing curve, animations are defined by two physical properties :   

Stiffness: A measure of the spring's strength. Higher stiffness results in a faster animation that resolves more quickly.

Damping Ratio: Describes how quickly the spring's oscillations decay. A higher damping ratio stops the "bounce" faster. A damping ratio of exactly 1.0 results in a critically damped spring with no bounce at all.

This physics-based approach is inherently more adaptive and scalable. Because animations are not tied to a fixed time, they feel natural and appropriate whether an element is moving a short distance on a small screen or a long distance on a large screen.   

2.4.2 Motion Schemes: Expressive vs. Standard
The system provides two preset motion schemes that define the overall feel of the application's animations :   

Expressive (Default): This is the recommended scheme for most use cases. It uses a lower damping ratio, which causes animations to slightly overshoot their final destination and "bounce" back into place. This creates a lively, spirited, and engaging feel. It is particularly well-suited for hero moments and key interactions.

Standard: This scheme uses a higher damping ratio, resulting in minimal bounce. It feels more functional and direct, and should be used for utilitarian applications or in contexts where the bounciness of the Expressive scheme might feel distracting or inappropriate.

The entire application should use one scheme by default (preferably Expressive), with the ability to override it for specific components or screens where a different feel is desired.   

2.4.3 Spatial vs. Effects Springs
To apply motion correctly, the system's spring tokens are divided into two categories based on their purpose :   

Spatial Tokens: These are used for animations that change an element's physical properties on screen, such as its position (transform), size (width, height), or rotation (rotate). These springs are designed to overshoot and bounce, providing clear visual feedback for movement.

Effects Tokens: These are used for animating properties like color, background-color, and opacity. For these properties, a bounce is generally undesirable as it can look jarring. Therefore, effects springs are configured with a higher damping ratio to ensure they resolve smoothly without overshooting.

Each of these two types is available in three speeds: fast, default, and slow, allowing for further refinement of the animation feel based on the size of the element and the context of the interaction.   

The tokenization of these physics properties abstracts away the complexity of implementation. The AI does not need to calculate Bézier curves or manage animation timelines. It simply needs to apply the correct semantic spring token to a CSS transition property. For example: transition: transform var(--md-sys-motion-spring-fast-spatial-stiffness) var(--md-sys-motion-spring-fast-spatial-damping). This declarative approach makes it possible to implement sophisticated, consistent animations systematically.

2.4.4 Table: M3 Motion Spring Tokens (Stiffness & Damping Values)
This table is the master reference for all animation physics. The AI shall use these values to define the CSS custom properties for the application's motion system. The Expressive scheme uses a damping ratio of 0.9 for spatial springs to create its characteristic bounce.

Token Name

Scheme

Type

Speed

Damping Ratio

Stiffness

Usage

motionSpringFastSpatial

Expressive

Spatial

Fast

0.9

1400

Small components (buttons, switches).

motionSpringFastEffects

Expressive

Effects

Fast

1.0

3800

Small component effects (color, opacity).

motionSpringDefaultSpatial

Expressive

Spatial

Default

0.9

700

Partial screen elements (sheets, dialogs).

motionSpringDefaultEffects

Expressive

Effects

Default

1.0

1600

Partial screen effects.

motionSpringSlowSpatial

Expressive

Spatial

Slow

0.9

300

Full-screen transitions.

motionSpringSlowEffects

Expressive

Effects

Slow

1.0

800

Full-screen transition effects.


Export to Sheets
   

2.5 Iconography
The iconography system ensures that symbols are clear, consistent, and stylistically aligned with the rest of the M3 Expressive language.

2.5.1 Using Material Symbols
The official and mandatory icon set for the application is Material Symbols. Using this set is critical for maintaining visual consistency and leveraging the system's advanced features. The icons are provided as a single    

variable font, which is the required method of implementation. This allows for the dynamic adjustment of icon styles via font axes, which is a core tenet of expressive design.   

2.5.2 Stylistic Variants and Adjustable Axes
The Material Symbols font provides several axes for customization, which must be controlled via CSS font-variation-settings.

Styles: The font includes three distinct visual styles that can be chosen to match the application's brand personality :   

Outlined: The default, clean style.

Rounded: A softer style with rounded corners, pairing well with rounded typography and shapes.

Sharp: A crisp style with straight edges and 0dp corners.

Adjustable Axes :   

Weight (wght): Defines the stroke thickness. The value can range from 100 (Thin) to 700 (Bold). The default regular weight is 400.

Fill (FILL): A binary axis with a value of 0 (unfilled/outlined) or 1 (filled). This is essential for communicating toggle states.

Grade (GRAD): Provides granular control over the symbol's thickness without affecting its overall width. This is used for subtle visual corrections, such as making a light-colored icon on a dark background slightly thicker to improve its visual weight.

Optical Size (opsz): Ranges from 20 to 48. This axis automatically adjusts the icon's stroke weight as its font size changes, ensuring that a large icon doesn't look overly bold and a small icon doesn't become illegible.

2.5.3 Sizing, Placement, and Target Area Rules
Strict adherence to sizing and spacing rules is required for both usability and accessibility.

Standard Size: The baseline icon size is 24x24dp. A smaller 20dp size is available for use in dense layouts, such as on desktop.   

Live Area: Within the 24dp icon frame, the actual icon artwork must be designed within a 20x20dp live area, leaving a consistent 2dp padding on all sides. Content may only extend into this padding if absolutely necessary for visual balance.   

Touch Target: This is a non-negotiable accessibility requirement. Regardless of the visual size of the icon, the minimum interactive touch or click target area for any icon button must be 48x48dp. This is typically achieved by adding padding around the visual icon element.   

Toggle State Logic: For any component that functions as a toggle (e.g., a toggleable icon button), the state change must be communicated visually using the Fill axis. The unselected state must use an unfilled icon ('FILL' 0), and the selected state must use a filled icon ('FILL' 1).   

2.6 Accessibility by Design
Accessibility is not an afterthought in Material 3; it is a foundational principle integrated into the design system's core. All generated components must meet these standards without exception.   

2.6.1 Color Contrast Requirements (WCAG 2.1 AA)
The M3 color system is designed to meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA contrast requirements by default when using the token system correctly. The AI must enforce these minimum contrast ratios:   

Normal Text: Must have a contrast ratio of at least 4.5:1 against its background.   

Large Text: Defined as 18.5px (1.156rem) and bold, or 24px (1.5rem) and regular weight. Must have a contrast ratio of at least 3:1.   

Non-Text Elements: UI components (like input borders) and graphical objects (like icons) must have a contrast ratio of at least 3:1 against their adjacent colors.   

2.6.2 Minimum Touch Target Sizes
As stated in the Iconography section but applicable to all interactive elements, the minimum target size for any interactive component (button, link, input, etc.) must be 48x48dp. This ensures that users with motor impairments can interact with the UI reliably.   

2.6.3 Semantic Structure and ARIA Roles
The AI must generate semantically correct HTML to ensure compatibility with assistive technologies like screen readers.

Use Native Elements: Native HTML elements such as <button>, <nav>, <input>, and <dialog> must be used whenever their function matches the requirement. These elements have built-in accessibility features and keyboard interactions.   

Apply ARIA Roles: When creating custom components that do not have a native HTML equivalent, appropriate ARIA (Accessible Rich Internet Applications) roles, states, and properties must be applied. For example, a custom toggle switch must have role="switch" and the aria-checked attribute.

3.0 Responsive Layout and Grid System
The M3 layout system is designed to be adaptive by default, providing a clear framework for creating consistent and usable experiences across a wide range of screen sizes. It is based on a system of window size classes, a flexible column grid, and defined spacing rules.   

3.1 Window Size Classes and Breakpoints
The primary mechanism for responsive design in M3 is a set of window size classes. These are opinionated breakpoint ranges that dictate when a layout should significantly change to adapt to the available screen space. Layout decisions must be based on these window classes, not on specific device types or orientations.   

The M3 responsive system is more prescriptive than older systems, focusing on "canonical layouts" and specific component adaptations for each window class. This provides a clear, rule-based decision tree that is ideal for an AI. For example, the rule is: IF window_class IS 'Compact', THEN use Navigation Bar; IF window_class IS 'Expanded', THEN use Navigation Rail. Similarly, a list-detail view should render as a single pane on Compact screens but as two distinct panes on Expanded screens. This structure simplifies the logic required for generating responsive layouts.   

3.2 Table: M3 Responsive Breakpoint System
This table provides the core data for all responsive logic. The AI shall use these values to define its media queries and trigger changes in layout, column count, and component selection.

Window Class

Breakpoint Range (dp)

Columns

Margin (dp)

Gutter (dp)

Common Devices / Recommended Layout

Compact

Width < 600

4

16

16

Phones in portrait. Single-pane layouts.

Medium

600 ≤ width < 840

8

24 / 32

24

Tablets in portrait, large phones in landscape, unfolded foldables. Single-pane (recommended) or two-pane layouts.

Expanded

Width ≥ 840

12

32+ (scaling)

24

Tablets in landscape, desktops. Two-pane layouts are recommended.


Export to Sheets
   

3.3 The 12-Column Grid
The content area of the layout is structured on a responsive grid. The number of columns in this grid changes based on the current window size class :   

Compact: 4 columns

Medium: 8 columns

Expanded: 12 columns

Column widths must be fluid (defined using percentages or fr units in a CSS Grid) to allow content to scale smoothly within a breakpoint range. Items in the grid can span one or more columns.   

3.4 Rules for Margins, Gutters, and Spacing
Consistent spacing is crucial for creating a visually balanced and rhythmic layout.

Margins: The space between the screen edge and the main content area. Margin widths are typically fixed values that increase at larger breakpoints to provide more whitespace, as defined in the table above.   

Gutters: The space between columns in the grid. Like margins, these are fixed values that can change at different breakpoints to adjust the density of the content.   

General Spacing: All other spacing measurements—such as padding within components, or the space between elements—must align to a 4dp or 8dp grid. This ensures a consistent visual rhythm throughout the entire UI. Spacers between layout panes should be 24dp wide.   

4.0 Component Library: Detailed Specifications
This section provides detailed specifications for key M3 Expressive components. The AI must adhere to these rules for type, state, and token application.

4.1 Action Components
Action components are the primary interactive elements that allow users to achieve an aim.

4.1.1 Buttons (<button>)
Buttons prompt users to take action. M3 Expressive introduces a wider variety of configurations for size, shape, and behavior.   

Types/Configurations: There are five main styles of button, ordered by emphasis :   

Filled: The highest emphasis button. Uses a solid primary container color. For the most important action on a screen.

Elevated: A high-emphasis button that has a shadow to lift it from the surface.

Tonal: A medium-emphasis button that uses the secondary-container or tertiary-container color. A good alternative to Filled buttons when a less prominent action is needed.

Outlined: A medium-emphasis button with a transparent container and a visible stroke using the outline color.

Text: The lowest emphasis button, used for secondary actions. It has no visible container.

Expressive Features:

Shape: Buttons can have a Round shape (fully rounded corners, md.sys.shape.corner.full) or a Square shape (using a smaller corner radius like md.sys.shape.corner.small).   

Size: Five sizes are available: Extra Small, Small, Medium, Large, and Extra Large.   

Toggle: Buttons can now be configured as toggle buttons to represent a selected/unselected state.   

Motion: Buttons must use the Expressive motion scheme, causing them to morph shape and react with a spring animation when pressed.   

States and Token Application: The visual appearance of a button must change to reflect its current state.

4.1.1.1 Table: Button State Styling (Filled Button Example)
State

Container Color Token

Label/Icon Color Token

State Layer Color Token

State Layer Opacity

Notes

Enabled

md.sys.color.primary

md.sys.color.on-primary

-

-

Default state.

Disabled

md.sys.color.on-surface

md.sys.color.on-surface

-

38% (Container), 38% (Label)

The entire button is visually deemphasized. Not interactive.

Hover

md.sys.color.primary

md.sys.color.on-primary

md.sys.color.on-primary

8%

A state layer overlay appears on top of the container.

Focus

md.sys.color.primary

md.sys.color.on-primary

md.sys.color.on-primary

12%

A state layer overlay appears. A focus ring must also be visible.

Pressed

md.sys.color.primary

md.sys.color.on-primary

md.sys.color.on-primary

12%

A state layer overlay and a ripple effect are shown.


Export to Sheets
   

4.1.2 Icon Buttons (<button>)
Icon buttons allow users to take minor actions with a single tap.

Types: Default (for single actions like "menu" or "search") and Toggle (for binary on/off states like "favorite" or "bookmark").   

Color Styles: Icon buttons are available in Filled, Tonal, Outlined, and Standard (no container) configurations.   

Expressive Features: M3 Expressive introduces more shapes (round/square) and sizes for icon buttons. Critically, they can be configured to morph shape when toggled (e.g., from a circle to a rounded square). When placed in a    

Button Group, they interact with each other when pressed.   

State Logic: This is a critical rule. For toggleable icon buttons, the unselected state must use an outlined icon ('FILL' 0). The selected state must use a filled version of the same icon ('FILL' 1).   

4.1.3 Floating Action Buttons (FAB)
The FAB represents the most important, primary action on a screen and floats above other content.   

Types: FAB (circular, icon only), Extended FAB (wider, includes a text label).

Expressive Features: M3 Expressive introduces the FAB menu, where a FAB can be tapped to expand and reveal multiple related, secondary actions. Additionally, new    

Toolbar components are designed to be paired with a FAB, creating a cohesive action center at the bottom of the screen.   

4.2 Containment Components
Containment components hold information and actions.

4.2.1 Cards (<div>)
Cards are surfaces that display content and actions on a single topic. They are a primary tool for creating hierarchy and grouping related information.   

Types :   

Elevated: Uses a shadow (md.sys.elevation.level1 or higher) to create clear separation from the background.

Filled: Uses a subtle container fill color (md.sys.color.surface-variant or surface-container-low) for less separation.

Outlined: Uses a border (md.sys.color.outline) to define its boundary.

States: Cards have enabled, disabled, hover, pressed, and dragged states. Interactive cards must show a    

hover state overlay and a pressed state ripple.

Expressive Application: Cards are the primary implementation of the "Contain content for emphasis" tactic. In expressive layouts, it is common to wrap list items in    

ElevatedCard components to give each item a distinct shape, elevation, and interactive feel. The corner radius of cards should be set using the shape tokens, often    

md.sys.shape.corner.medium or large.

4.3 Navigation Components
Navigation components help users move through the application. M3 Expressive introduces significant changes to the recommended navigation patterns.

4.3.1 Flexible Navigation Bar (Bottom Bar)
The navigation bar is the primary navigation component for Compact and Medium window classes.   

Expressive Update: The original, taller M3 navigation bar is deprecated. It is replaced by the shorter Flexible Navigation Bar. On    

Medium screens (e.g., tablets in portrait), this new component can display destination labels horizontally to the side of the icons, making better use of the available space.   

Styling: The active destination must be indicated with a pill-shaped indicator. This indicator uses the md.sys.color.secondary-container for its fill and md.sys.color.on-secondary-container for the icon and label, ensuring it stands out.   

4.3.2 Navigation Rail
The navigation rail is the primary navigation component for Medium (optional) and Expanded window classes.   

Expressive Update: The Navigation Drawer (or "hamburger menu") is deprecated in M3 Expressive for new designs. The    

Navigation Rail is its official replacement, as it adapts more gracefully across different screen sizes. The rail can be presented in a collapsed state (icons only) or an expanded state (icons and labels).   

4.3.3 Top App Bar and Toolbars
The Top App Bar is a container at the top of the screen for branding, navigation icons, and page-specific actions.   

Expressive Features: M3 Expressive introduces a new, highly flexible set of Toolbar components. These are intended to replace the old M2 Bottom App Bar and provide more versatile options for placing actions. Toolbars can be    

Docked (attached to an edge) or Floating, and can be laid out horizontally or vertically. They are often paired with a FAB to create a powerful, consolidated action area.   

4.4 Communication Components
4.4.1 Dialogs
Dialogs are modal windows that provide users with important information or require them to make a decision.   

Types :   

Basic: A simple modal dialog used for alerts, confirmations, or quick selection tasks.

Full-screen: Used for more complex tasks that require more space, such as creating a new calendar entry.

Styling: M3 dialogs feature a larger corner radius (md.sys.shape.corner.extra-large), increased padding, and a larger, more prominent headline using a Title or Headline type role to draw attention to the dialog's purpose. The container uses the    

md.sys.color.surface-container-high color role.

4.5 Text Input Components
4.5.1 Text Fields (<input>)
Text fields allow users to enter and edit text. They are a fundamental part of forms and dialogs.   

Types :   

Filled: Has a container with a background fill (md.sys.color.surface-variant). This style has higher visual emphasis and is best for short forms or when the field needs to stand out.

Outlined: Has a transparent container with a visible border (md.sys.color.outline). This style has lower visual emphasis and is suitable for long, dense forms where multiple fields are present.

States: Text fields must clearly communicate their state at a glance. Key states include    

enabled, disabled, hover, focused, and error.   

Focused State: When a user clicks or tabs into a text field, the label must animate up to sit above the input area. The indicator line (for Filled) or the outline (for Outlined) must become thicker (2dp) and change color to md.sys.color.primary.

Error State: When validation fails, the label, indicator/outline, and supporting text must all change color to md.sys.color.error. The supporting text should provide a concise, actionable error message.

5.0 Design Tokens: The Single Source of Truth
The entire M3 Expressive system is built upon a robust architecture of design tokens. These tokens are the atomic, reusable design decisions that form the single source of truth for the application's visual style, connecting design tools directly to code.   

5.1 Token Architecture: Reference, System, and Component
The system uses a three-tier token hierarchy, which allows for both global scalability and granular control.   

Reference Tokens: These represent the raw, static values available in the system. They are the complete palette of options. For example, md.ref.palette.primary40 is a reference token that points to the hex value #6750A4.   

System Tokens: These are semantic roles that define the character of the theme. They point to reference tokens. For example, the system token md.sys.color.primary points to the reference token md.ref.palette.primary40. This level of abstraction allows a theme to be changed globally by remapping system tokens to different reference tokens.   

Component Tokens: These are tokens assigned to specific parts of a component. They point to system tokens. For example, the token for a filled button's container color, md.comp.filled-button.container.color, points to the system token md.sys.color.primary.   

This hierarchical structure is what enables systematic theming. To change the primary brand color across the entire application, one only needs to change the reference token that md.sys.color.primary points to. This change will then automatically propagate to every component that uses that system token.

5.2 Integrating with Tooling (Figma)
The design-to-code workflow is streamlined through the use of the official Material Theme Builder plugin for Figma. This tool can generate a full set of color and type tokens from a source color and apply them directly to the official    

M3 Design Kit file.

The M3 Design Kit itself is built using these tokens, implemented as Figma's native variables and styles. This allows designers to work with the same semantic language as developers, ensuring that a design mockup is a true representation of the final coded product.   

For automated implementation, the AI should be capable of ingesting exported token files. The Material Theme Builder can export tokens in various formats, including a Design System Package (DSP) JSON format, which provides a structured, machine-readable definition of the entire theme.   

The direct link to the official Material 3 Design Kit on the Figma community is: https://www.figma.com/community/file/1035203688168086460.   

6.0 Conclusion and Recommendations
This style guide provides a definitive and exhaustive specification for implementing a responsive web application that strictly adheres to the Google Material 3 Expressive design language. The core of this system is a move beyond simple consistency towards creating user interfaces that are emotionally resonant, personally adaptive, and demonstrably more usable.

The successful implementation by an AI tool hinges on the strict and systematic application of the principles and values defined herein. The following points are paramount:

Embrace the Token-Based Architecture: All styling decisions—for color, typography, shape, and motion—must be driven by the provided design tokens. Hard-coded values are strictly prohibited, as they break the system's scalability, theming capabilities, and the connection between design and code.

Prioritize Expressiveness for Usability: The application of expressive features—such as emphasized typography, vibrant color accents, and shape morphing—should be purposeful. These tools must be used primarily to establish clear visual hierarchy, guide user attention to key actions, and provide meaningful feedback, as supported by Google's own research.

Implement Responsive Design via Window Size Classes: The layout must adapt based on the Compact, Medium, and Expanded window size classes. This includes changing the grid column count, margins, and swapping entire navigation components (e.g., Navigation Bar for Navigation Rail) as specified.

Ensure Accessibility is Non-Negotiable: All generated components must meet the specified WCAG 2.1 AA contrast ratios and have a minimum interactive target size of 48x48dp. The use of semantic HTML and ARIA roles is mandatory.

By adhering to this structured, token-driven approach, the AI can generate web applications that are not only visually stunning and in line with modern design trends but are also coherent, accessible, and fundamentally easier for people to use. The M3 Expressive system provides the tools to build products that don't just look nice, but feel right.
