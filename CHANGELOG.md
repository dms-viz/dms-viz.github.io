# `dms-viz.github.io` Changelog

## [0.1.0] - 2023-08-21

### Added

- Initial unstable release of the `dms-viz.github.io` API.

### Changed

- N/A (This is the first release)

### Deprecated

- N/A (This is the first release)

### Removed

- N/A (This is the first release)

## [0.1.1] - 2023-08-24

### Added

- Ligands can also be colored by the element identity of their atoms.

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.2.0] - 2023-08-25

### Added

- Users can provide a URL to automatically load a markdown description file.

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.2.1] - 2023-08-28

### Added

- Accommodate an option for specifying the negative end of the color scale for each condtion.

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.2.2] - 2023-08-29

### Added

- Accommodate an option for specifying the minimum and maximum range on filter slides.

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.2.3] - 2023-08-29

### Added

- Add LaTeX support to markdown rendering using katex.

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.2.4] - 2023-09-05

### Added

- N/A

### Changed

- Fix the color scale of the protein to show only white when the domain of the data is [0, 0].
- Set the default value of `floor` to `false`.

### Deprecated

- N/A

### Removed

- N/A

## [0.2.5] - 2023-09-15

### Added

- N/A

### Changed

- Add link to documentation website
- Change the plot sizing to be more consistent in `<iframes>`

### Deprecated

- N/A

### Removed

- N/A

## [0.2.6] - 2023-09-27

### Added

- N/A

### Changed

- Fix a bug that cuases the size of the plot to be stochasitc due to the timing of the sidebar collapsing when the window is sufficently small.

### Deprecated

- N/A

### Removed

- N/A

## [0.2.7] - 2023-09-27

### Added

- Add bond order to ball+stick structure for the ligands.
- Add the ability to show nucleotides.

### Changed

- Be more selective when showing data chains or background chains to only show the protein.

### Deprecated

- N/A

### Removed

- N/A

## [0.2.8] - 2023-09-28

### Added

- Added the ability to show non-carbon bonded hydrogens.
- Added the ability to color the protein by element color.

### Changed

- Don't show hydrogens by default in the structure.
- Increased the default radiusScale for ball+stick on ligands to make them more visible

### Deprecated

- N/A

### Removed

- N/A

## [0.2.9] - 2023-10-11

### Added

- N/A

### Changed

- Changed the default example dataset to antibody escape data with antibodies in the structure.

### Deprecated

- N/A

### Removed

- N/A

## [0.2.10] - 2023-10-12

### Added

- N/A

### Changed

- Fixed a bug where the structure wouldn't recolor when the filters were used.

### Deprecated

- N/A

### Removed

- N/A

## [0.2.11] - 2023-10-12

### Added

- Added a button to select all sites in the protein and set selection as the default.

### Changed

- Refactored how selection works in the chart object.
- Made the protein object emit an even on successful loading
- Stopped redundant protein loading when the dataset is changed but the protein is the same

### Deprecated

- N/A

### Removed

- N/A

## [0.2.12] - 2023-10-13

### Added

- N/A

### Changed

- Sites on the protein can now be selected or deselected by clicking on points in the focus plot.

### Deprecated

- N/A

### Removed

- N/A

## [0.3.0] - 2023-10-19

### Added

- Markdown can now be rendered from both a URL and a local JSON file.

### Changed

- Refactored Main.js entrypoint to the application to be a bit simpler.

### Deprecated

- N/A

### Removed

- N/A

## [0.3.1] - 2023-10-28

### Added

- N/A

### Changed

- Fixed a bug in the Protein class that improperly labels and colors sites over discontinuous chains (i.e. if there are more than one measurement for the same 'protein_site'.)

### Deprecated

- N/A

### Removed

- N/A

## [0.3.2] - 2023-11-01

### Added

- N/A

### Changed

- Fixed a bug in the Protein class that improperly labeled reference sites on the structure when the data changed. Now the tooltip is updated when the data changes.

### Deprecated

- N/A

### Removed

- N/A

## [0.3.3] - 2023-11-03

### Added

- N/A

### Changed

- Accommodate an additional value in the filter columns that lets you specify a default value for the slider in the json dataset.

### Deprecated

- N/A

### Removed

- N/A

## [0.3.4] - 2023-11-05

### Added

- N/A

### Changed

- Fix a bug where the filter values in the URL were getting overwritten by a default no matter what.

### Deprecated

- N/A

### Removed

- N/A

## [0.4.0] - 2024-02-13

### Added

- Support for insertion codes
- The software version is dynamically displayed on the page
- Meta tags for SEO
- Add median as a summary statistic

### Changed

- Chart options are open by default
- Select all sites is now a button

### Deprecated

- N/A

### Removed

- N/A

## [0.5.0] - 2024-03-12

### Added

- Added a button to change the color of the protein background

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

## [0.6.0] - 2024-04-10

### Added

- N/A

### Changed

- Complete overhaul of CSS and UI components.

### Deprecated

- N/A

### Removed

- N/A

## [0.6.1] - 2024-04-10

### Added

- N/A

### Changed

- Fixed the padding around the plots to be the same as the navbar.

### Deprecated

- N/A

### Removed

- N/A

## [0.6.2] - 2024-04-11

### Added

- N/A

### Changed

- Harmonize the padding, margins, and min/max widths of the sidebar and main content.

### Deprecated

- N/A

### Removed

- N/A

## [0.6.3] - 2024-04-11

### Added

- N/A

### Changed

- Make sure that submenus are correctly resized when the data changes.

### Deprecated

- N/A

### Removed

- N/A

## [0.6.5] - 2024-05-15

### Added

- N/A

### Changed

- Fixes a bug where the axis titles and tooltips weren't changing between datasets by removing dataset-defined values from the Chart constructor.

### Deprecated

- N/A

### Removed

- N/A

## [0.7.0] - 2024-05-15

### Added

- Allow users to set the min, max, and center of the color scales.
- Allow for color scales that aren't symmetric around 0.

### Changed

- Clear the URI parameters when data is loaded from a local file.

### Deprecated

- N/A

### Removed

- N/A

## [0.8.0] - 2024-05-15

### Added

- Allow users to set the default summary metric and default value for floor

### Changed

- N/A
### Deprecated

- N/A

### Removed

- N/A

## [0.8.1] - 2024-05-22

### Added

- N/A

### Changed

- Menu options 'summary' and 'floor' set in the config file populate the menu when the dataset changes.

### Deprecated

- N/A

### Removed

- N/A

## [0.8.2] - 2024-05-28

### Added

- N/A

### Changed

- Add style to color hyperlinks in markdown.

### Deprecated

- N/A

### Removed

- N/A

## [0.8.3] - 2024-06-13

### Added

- N/A

### Changed

- Fix a bug where floor was determined by the config in the chart but not for the protein.

### Deprecated

- N/A

### Removed

- N/A

## [0.8.4] - 2024-07-08

### Added

- N/A

### Changed

- Fix a bug in NGL by bumping it to the most recent version.

### Deprecated

- N/A

### Removed

- N/A

## [0.8.5] - 2024-07-08

### Added

- N/A

### Changed

- Make it easier to select and de-select options with double-clicking.

### Deprecated

- N/A

### Removed

- N/A