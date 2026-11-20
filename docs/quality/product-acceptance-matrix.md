# Product acceptance coverage matrix

Source: checked-in snapshot captured from live Figma metadata, file `r10szKLgiIPVi2NBmbjTpm`. CI validates this snapshot against the acceptance shards but does not refresh Figma.
119 top-level frames are inventoried and each belongs to exactly one track. This is not a claim of full functional or visual certification.

| Track                                                     | Frames | What it answers                                                                             |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| [Active product acceptance](active-product-acceptance.md) | 45     | Does the shipping product do what its frames describe? Its gaps are real.                   |
| [Design history](design-history.md)                       | 73     | Frames of capabilities that were retired from the product. Kept for traceability; not gaps. |
| [Future candidates](future-candidates.md)                 | 1      | Ideas that are not built yet and the evidence needed before they are.                       |

## Status of the active product

- AUTOMATED_PASS: 28
- NOT_IMPLEMENTED_PRODUCT_GAP: 4
- DESIGN_REFERENCE_ONLY: 4
- MANUAL_REVIEW_REQUIRED: 8
- BLOCKED_WITH_REASON: 1

Only the active track says anything about the product that ships today. The design history lists retired capabilities and a status there means "retired", so it is not added to these numbers.

Automated browser behavior and human-reviewed Figma visual parity are separate claims. No human visual certification is implied by this registry.
