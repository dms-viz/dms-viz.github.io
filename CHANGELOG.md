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