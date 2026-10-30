# Machine learning workspace

No dataset, training code or model is implemented. Use TASKS.md Phase 2 and SPEC.md.
The optional ML dependency set lives in backend/pyproject.toml to avoid duplicate Python
environments. From the repository root, `uv sync --project backend --extra ml` installs
it when beginning ML work (not required for health/API development).

Create ml/src/, ml/tests/ and ml/notebooks/ only when they contain actual work. Training
must emit a manifest and model card; shared preprocessing must be importable by training
and inference. Keep datasets in ignored data/ or outside the repository. No automatic
dataset/model downloads are part of the foundation.


## P2-01 research record ? October 16, 2026

Status: research recommendation only, **not an approved dataset or model selection**.
P2-01 remains open because acceptance includes owner approval of the crop/class set.
Read-only publisher pages, papers, license texts and weight documentation were inspected;
no dataset images/archives, weights, ML dependencies or training were downloaded/run.
Source-reported counts below are image counts, not independently measured unique leaves.
No archive checksums, duplicate rates, group counts or HORTI metrics have been measured.
P2-02 provenance artifacts and P2-03 data inspection/splits have not been started.

### Recommendation for owner review

Recommend one crop, **tomato**, with three labels: healthy, early blight and late blight,
using only the original PlantVillage **color** representation for a first educational
baseline, conditional on accepting/resolving the licensing terms below. These labels are
listed in the [author-linked PlantVillage card](https://huggingface.co/datasets/mohanty/PlantVillage/blob/main/README.md).
No archive or mutable repository revision is selected yet.

| Proposed label | Historical publisher count, April 2016 | Interpretation |
| --- | --- | --- |
| Tomato healthy | 1,592 | Visually healthy examples; not proof of freedom from all disease |
| Tomato early blight | 1,000 | One supported disease label |
| Tomato late blight | 1,910 | One supported disease label |
| Total | 4,502 (arithmetic sum) | Planning estimate, not a verified current-release count |

Counts come from Table 1 of Hughes and Salathe's
[original dataset paper](https://arxiv.org/pdf/1511.08060), whose reported snapshot differs
from subsequent releases. They must be reconciled against the chosen release before use.

Rationale (engineering judgment): three outputs keep label review, error analysis and
baseline experiments manageable while including healthy leaves and two disease classes.
Avoid initially mixing crops, pest damage, viral symptoms, severity or multiple diagnoses.
The main tradeoffs are visually similar symptoms, omitted tomato diseases, and a controlled
capture domain that does not represent arbitrary Android camera photographs. This is a
closed-set learning experiment: excluding other labels does not teach unknown-input
rejection. Do not merge excluded diseases into healthy or invent an unknown class without
evaluated examples. Scores/abstention cannot establish that an unsupported input is safe.

Other small PlantVillage choices, using the same historical Table 1: potato has 1,000
early-blight, 1,000 late-blight and only 152 healthy images; bell pepper has 997 bacterial
spot and 1,478 healthy images; apple has 630 scab, 621 black rot, 276 cedar rust and 1,645
healthy images. Judgment: potato's healthy minority and apple's rust minority complicate
small held-out groups; bell pepper's two classes are the simpler fallback if the owner
prefers a binary scope. None avoids the PlantVillage license/domain questions.

### Dataset comparison: verified facts and limits

**PlantVillage ? original authors' release path.**
[Hughes and Salathe](https://arxiv.org/pdf/1511.08060) describe U.S. research-station
leaves removed from plants, photographed outdoors on grey/black paper, typically 4?7
views per leaf, with expert disease labels. This is controlled capture despite outdoor
lighting. The paper declares CC BY-SA 3.0 Unported and explicitly extends that license
to algorithms trained on the data. This author statement needs owner review; do not
silently treat a trained artifact as covered only by HORTI's MIT license.

The [authors' GitHub repository](https://github.com/spMohanty/PlantVillage-Dataset) directs
users to mohan?ty/PlantVillage on Hugging Face (account spelling: `mohanty`). The
[author-linked card](https://huggingface.co/datasets/mohanty/PlantVillage/blob/main/README.md)
declares `cc-by-sa-3.0`, 38 crop/condition labels, leaf_id metadata and color/grayscale/
segmented representations. It advertises leaf-grouped 80/20 splits; its color metadata
lists 43,596 train + 10,709 test = 54,305 images, while its prose says 54,306. The original
dataset paper reports 54,309. These are unresolved snapshot/count differences, not a reason
to substitute a mirror's counts. Current per-class counts and group coverage are unknown.

The [2016 classification paper](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2016.01419/full)
reports 54,306 images / 38 classes, same-leaf mappings for 41,112 images, and accuracy
falling to roughly 31% on external images. These are the authors' experiments, not HORTI
results. Inference: same-leaf views and alternate representations can leak across splits;
source/session/background correlations can remain even after leaf grouping. The card's
claims do not prove complete independent-plant identities or a duplicate-free release.
Use color only initially; never split color and segmented versions as independent images.

Exact declared license:
[CC BY-SA 3.0 Unported deed](https://creativecommons.org/licenses/by-sa/3.0/) and
[legal code](https://creativecommons.org/licenses/by-sa/3.0/legalcode).
The deed allows reuse/adaptation, including commercial use, subject to attribution,
license notice, change indication and ShareAlike conditions. Preserve authors, source,
license and modifications in future attribution records. How the original authors'
trained-algorithm clarification applies to HORTI's weights/service/release is unresolved;
seek clarification if intended distribution cannot comply. No rights approval is inferred.

**PlantDoc ? authors' cropped classification and detection releases.**
The [original author repository](https://github.com/pratikkayal/PlantDoc-Dataset) identifies
its contents as Cropped-PlantDoc and declares
[CC BY 4.0 International](https://github.com/pratikkayal/PlantDoc-Dataset/blob/master/LICENSE.txt).
The [authors' paper](https://arxiv.org/pdf/1911.10317) reports 2,598 source images,
13 species, 27 crop/condition classes (17 disease types), and 9,216 derived leaf crops.
It describes web-search collection, manual duplicate removal and double review, but also
acknowledges possible label errors. Crops are small, with varied backgrounds; multiple
crops can share a source photograph. These units must not be conflated with independent
images or plants. Exact current per-class file counts were not verified; do not read
approximate histogram heights as exact counts.

Judgment: more relevant visual clutter than PlantVillage, but weaker source-level rights
traceability and annotation certainty make it a poor first training source. Its claimed
license permits sharing/adaptation with attribution and change notices; see
[official CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/legalcode).
A repository license only grants rights held by its licensor; it does not establish that
every scraped photograph was licensed by its original photographer. Per-image URLs,
rights, geography and plant/session IDs remain unverified. Near-duplicate web copies,
shared source crops and overlap with other public datasets remain possible despite the
authors' deduplication. Do not mix it into train/test until rights and source groups are
resolved. Conditional candidate for a separately reported external stress test, not an
approved unbiased field benchmark.

**Plant Pathology 2020 / FGVC7 ? Cornell-led field alternative.**
The [original authors' paper](https://arxiv.org/pdf/2004.11958) describes the 2019 growing
season at an unsprayed Cornell AgriTech orchard in Geneva, New York, with DSLR/smartphone
images under varied conditions. Its full pilot collection has 3,651 images: scab 1,200,
cedar apple rust 1,399, complex symptoms 187, healthy 865. This is one crop and four states;
the mixed-symptom label does not fit a simple single-disease assumption. The paper's
reported split numbers also do not reconcile cleanly with the total; these are not
verified usable competition-label counts.

The original competition's [data](https://www.kaggle.com/competitions/plant-pathology-2020-fgvc7/data)
and [rules](https://www.kaggle.com/competitions/plant-pathology-2020-fgvc7/rules) pages were
located but did not render their full terms/data inventory in this review. **Exact image
license and rights to redistribute/train/release HORTI artifacts remain unverified.**
Neither the paper's open-access license nor a competition winner's source-code license
establishes image rights. No mirror license is substituted.

Judgment: apple healthy/scab/rust could be a stronger field-oriented alternative if the
owner prefers apples and original use terms are resolved. Do not assume the entire pilot
has accessible labels. One orchard/season is still narrow; repeated leaves, tree/session
correlation, cultivar confounding and overlap with other Cornell releases require checks.
Group metadata availability and actual duplicate rate are unknown. Exclude complex cases
explicitly rather than relabeling them; no regional generalization is established.

**Mendeley augmented release ? provenance caution, not original PlantVillage.**
The [deposit by Arun Pandian J and Geetharamani Gopal](https://data.mendeley.com/datasets/tywbtsjrjv/1)
is Version 1, April 18, 2019, DOI `10.17632/tywbtsjrjv.1`. It reports 61,486 images,
39 classes including background, six augmentation methods, and CC0 1.0. Those are that
deposit's declarations. It is not the original authors' release and cannot establish
permission to relicense upstream PlantVillage images. Parent-image lineage, pre-augmentation
counts and rights chain are unverified. Judgment: reject as initial source while unclear;
randomly splitting augmented siblings would create leakage. Do not use its background class
as proof of general unknown-crop/non-leaf rejection. CC0's scope is described by the
[official dedication](https://creativecommons.org/publicdomain/zero/1.0/); it does not clear
third-party rights the depositor lacks.

### Pretrained-weight comparison and permission status

Official Torchvision documentation was reviewed without instantiating models or fetching
weights. `stable` currently describes Torchvision 0.29; this does not change the repo lock
or establish that ML dependencies are installed. Pin a concrete library version and enum
later instead of relying on a mutable DEFAULT alias.

| Candidate weight enum | Official ImageNet-1K metadata | Reason to compare later |
| --- | --- | --- |
| `ResNet18_Weights.IMAGENET1K_V1` | 11,689,512 parameters; 1.81 GFLOPS; 44.7 MB; top-1 69.758% | Simple reference architecture; larger CPU/memory budget |
| `MobileNet_V3_Small_Weights.IMAGENET1K_V1` | 2,542,856 parameters; 0.06 GFLOPS; 9.8 MB; top-1 67.668% | Smaller compute/storage candidate; CPU latency advantage must be measured |

Sources: [official ResNet18 weights](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.resnet18.html)
and [official MobileNetV3-Small weights](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v3_small.html).
Both documented enums use bilinear resize 256, center crop 224, [0,1] scaling and mean
[0.485, 0.456, 0.406] / std [0.229, 0.224, 0.225]. These are source weight transforms,
not implemented HORTI transforms; crop choice must later preserve useful leaf symptoms.
ImageNet accuracy is not plant-disease accuracy, and GFLOPS is not a CPU latency result.

Recommendation (engineering judgment): start transfer-learning comparisons with ResNet18
as the understandable reference and MobileNetV3-Small as the compact candidate, after a
simple baseline and permission review. FastAPI remains the inference host; an Android
client does not require on-device inference or make MobileNet automatically preferable.
No winner, performance claim or pretrained weight is approved here.

The [Torchvision code license](https://github.com/pytorch/vision/blob/main/LICENSE) is
BSD 3-Clause: retain applicable copyright/conditions/disclaimer for source/binary
redistribution and do not imply endorsement. This is not an explicit blanket weight grant.
[Official model documentation](https://docs.pytorch.org/vision/stable/models.html)
warns that weights may have separate terms inherited from training data, and that model
construction with pretrained weights triggers a download. Neither enum page establishes
an unqualified commercial deployment/weight-redistribution license.
[ImageNet's original access terms](https://www.image-net.org/download.php) restrict its
database to non-commercial research/education; they do not, by themselves, resolve the
license of every downstream weight artifact. Record the applicable weight terms and
owner's intended use before download/use, and resolve public Google Play/API/redistribution
permissions before release. Do not infer either unrestricted commercial permission or a
categorical ban on all derived weights from the code license or database terms alone.
If unresolved, revisit weights/scope explicitly; random initialization is not assumed to
meet the ML performance target and does not remove plant-dataset obligations.

### Remaining decisions and acceptance

Owner approval is needed for the proposed tomato three-class scope (or a named alternative),
acceptance/clarification of PlantVillage's declared ShareAlike/trained-algorithm terms,
and the intended research/public-release use of pretrained weights. Unclear rights remain
blocking; approval alone is not evidence of missing permissions. No dataset is designated
approved and P2-01 remains unchecked. Immutable source revisions, license snapshots,
attribution and class mapping belong to P2-02 after selection; do not start that task here.

For later authorized inspection, measure exact/near duplicates before splitting; use leaf
IDs where trustworthy and augment with duplicate/source groups. Keep all views/crops/
augmentations of a parent in one split, check cross-dataset overlap, and document missing
tree/session identity. SPEC's stratified group 70/15/15 target and sealed test partition
remain unchanged; the publisher's 80/20 split is not HORTI's adopted split. Only training
receives augmentation. A legal, independent field test and reviewed disease content are
still needed; a curated-dataset pass does not validate camera images in deployment.

Validation on this documentation-only change (repository root):
`uv run --project backend --locked --offline python scripts/check_foundation.py` passed
with `UV_CACHE_DIR=.cache/uv`; `git diff --check` passed. The foundation validator checks
root/docs links, syntax and task IDs; an additional read-only check of Markdown link
targets in this ML README found no missing local targets. External facts were reviewed
through the cited publisher pages, not validated by that script. No ML/runtime tests,
quality measurements or hardware benchmarks were run for this literature-only change.

Handoff: P2-01, owner `codex-ml-research-20261016`, `feat/backend-foundation` / current
checkout, base/current commit `ccd7619fe97c98b4825f1ba3e16938a04bf1b00a`; uncommitted.
Changed only ml/README.md and this task's ownership/status text in TASKS.md. Existing
P1-04 source/documentation changes were preserved. Ownership released with acceptance
pending; no downloads, installs, training, commits or subsequent-task implementation.


## P2-01 selection follow-up - October 29, 2026

Status: **conditional recommendation; no approved dataset/weight selection**. This
follow-up preserves the earlier comparison and adds rights distinctions, not permission
to download or train. P2-01 remains unchecked. The owner decisions recorded below
in the later October 29 entry supersede the then-pending questions.

Recommend **tomato healthy / early blight / late blight**, original PlantVillage color
images only, for a small closed-set educational baseline. The
[author repository](https://github.com/spMohanty/PlantVillage-Dataset) still points to
[author-linked dataset card](https://huggingface.co/datasets/mohanty/PlantVillage/raw/main/README.md),
which lists all three labels and leaf_id metadata. Its declared split counts still total
54,305 while its prose says 54,306. Historical three-class total 4,502 is a planning
estimate, not a measured current inventory. Controlled backgrounds and repeated leaves
remain limitations; camera-field reliability and unknown-input rejection are unproven.
No immutable dataset release is approved or provenance manifest created here.

Prefer **ResNet18_Weights.IMAGENET1K_V1** as the first transfer-learning candidate after
a simple baseline and rights resolution; retain **MobileNet_V3_Small_Weights.IMAGENET1K_V1**
as a compact comparison, not an assumed deployment winner. Official metadata still lists
[ResNet18](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.resnet18.html)
as 11,689,512 parameters / 44.7 MB and
[MobileNetV3-Small](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v3_small.html)
as 2,542,856 / 9.8 MB. These do not establish HORTI accuracy or CPU latency. Neither
weight artifact is cleared for use by this recommendation.

### Rights and use cases that must remain separate

- **PlantVillage image rights:** the
  [original paper, page 7 in the PDF](https://arxiv.org/pdf/1511.08060) declares CC BY-SA 3.0
  and expressly applies the same license to trained algorithms. This is stronger evidence
  than a mirror's license label. The
  [license text](https://creativecommons.org/licenses/by-sa/3.0/legalcode.en) grants copying
  and adaptation with applicable attribution/ShareAlike conditions; it has no NonCommercial
  element. Research use is a plausible conditional path under that grant, not a blanket
  exception from all terms. Redistributing source images/adaptations requires a separate
  compliance check; do not relabel them as HORTI MIT material.
- **AI/ShareAlike interpretation:** [Creative Commons' AI guidance](https://creativecommons.org/using-cc-licensed-works-for-ai-training-2/)
  distinguishes conservative compliance advice from when copyright legally requires it.
  Its analysis ties BY/SA triggers to public sharing of protected works/adaptations and
  notes jurisdiction and memorization issues. It does not prove every trained classifier,
  output label or surrounding application is an adaptation. PlantVillage's explicit
  trained-algorithm statement still needs an artifact/use-specific interpretation. Do not
  automatically relicense the entire FastAPI/Android codebase, or assume serving labels
  makes ShareAlike irrelevant. Compatibility with the chosen pretrained artifact is unresolved.
- **Torchvision code versus weights:** the [BSD 3-Clause code license](https://raw.githubusercontent.com/pytorch/vision/main/LICENSE)
  permits software use/redistribution subject to its conditions. The
  [official model documentation](https://docs.pytorch.org/vision/stable/models.html) separately
  warns that pretrained models may carry training-data-derived terms. Availability through
  Torchvision is not an explicit clearance for HORTI research, commercial API use or
  downloadable fine-tuned weights. Record evidence for the exact artifact/use; owner
  approval cannot supply a missing grant.
- **ImageNet database versus derived weights:** official ImageNet download-page search
  results describe non-commercial research/educational access and disclaim image ownership
  ([download-images page](https://www.image-net.org/download-images.php),
  [current download page](https://ftp.image-net.org/download)). Direct fetches timed out
  on this review, so full current access terms were not independently read. These
  database-access restrictions neither grant downstream weight rights nor establish that
  all ImageNet-trained weights are categorically prohibited commercially. No ImageNet
  images are needed for the proposed transfer-learning workflow, but that alone does not
  settle weight-use rights.
- **Public API/app versus redistribution:** hosted inference exposes an interface and
  predictions; publishing a weight file or bundling it in an app gives users the artifact.
  They require separate rights/compliance analysis. Free public availability is not proof
  of non-commercial use, nor permission. The existing Android/public-API objective remains;
  a local-research-first decision would leave public release explicitly uncleared.

Alternative-source status remains conservative: the
[PlantDoc publisher license](https://github.com/pratikkayal/PlantDoc-Dataset/blob/master/LICENSE.txt)
was reachable, but it does not independently establish every scraped image's rights.
[Mendeley Version 1](https://data.mendeley.com/datasets/tywbtsjrjv/1) still declares CC0 and
augmented images; that does not resolve upstream relicensing authority. The
[FGVC7 rules page](https://www.kaggle.com/competitions/plant-pathology-2020-fgvc7/rules)
returned no readable text. None is promoted as a rights-cleared fallback.

### Exact owner decisions and external evidence still needed

1. Approve the tomato three-class scope conditionally, or name another crop/class scope.
2. Specify the intended use envelope: public API/app including possible monetization,
   whether trained weights will be redistributed, or local education first with public
   release still deferred. The existing mobile/public-service objective is not silently dropped.
3. Choose willingness to comply with applicable attribution/ShareAlike artifact terms
   once clarified, versus preferring another source with explicit permissive model-use terms.
   Scope approval and license preference are product decisions, not rights evidence.

External evidence still needed: an applicable interpretation/clarification of the
PlantVillage trained-algorithm grant for HORTI's proposed artifact/API/release; evidence
of the exact pretrained weights' permitted research/use/redistribution and compatibility
with those terms; and resolution of any rights gap rather than inferred permission.
No correspondence was sent. Later source/version inventory and provenance belong to
separately authorized P2-02; no data or weight downloads are authorized by this record.

Handoff: owner codex-ml-selection-20261029, feat/backend-foundation / current checkout,
base/current HEAD ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; changes uncommitted.
Only ml/README.md and TASKS.md changed for this follow-up; existing dirty backend/research
work preserved. Read-only publisher/license research only; no images/weights downloaded,
ML dependencies installed, training, P2-02, commits or pushes. Ownership released with
owner decisions and external permissions evidence pending; P2-01 is not complete.


Follow-up validation (repository root, UV_CACHE_DIR=.cache/uv):
`uv run --project backend --locked --offline python scripts/check_foundation.py`
exited 0 (syntax, local links and task IDs); `git diff --check` exited 0 with line-ending
warnings only. No application/ML tests were rerun for this documentation-only task.
These checks do not establish license permissions or model performance. Source access
limits above remain visible; unanswered owner questions are not treated as approval.


## P2-01 owner decisions and narrowed evidence gaps - October 29, 2026

The owner has made the following **product decisions**, not declarations of legal
permission. These supersede the unanswered product questions in earlier entries.

- Approve tomato healthy, early blight and late blight as the initial three-class
  educational scope, conditional on suitable dataset rights and data quality.
- Begin with local educational development. The intended future product remains a
  public Android application calling a hosted FastAPI API. Possible monetization stays
  open. Public release is a separate gate, not authorized by the local experiment.
- Keep trained weights server-side. Do not plan downloadable weights or on-device
  inference for the initial release. This reduces the intended distribution scope;
  it does not by itself resolve rights for hosted inference.
- Be willing to comply with applicable attribution and ShareAlike conditions on dataset
  and model artifacts once their scope and compatibility are established. Preserve MIT
  for original application code unless specific evidence warrants a separately reviewed
  change. No repository license or application-code license change is authorized here.

No new approval of PlantVillage files, pretrained weights, downloads, training or public
use is implied. ResNet18 remains the recommended first candidate, not an owner-selected
or rights-cleared weight artifact. MobileNet is only a later comparison candidate.

### Immediate local experiment: exact remaining checks

**Dataset candidate:** the author-linked dataset (`mohanty/PlantVillage`),
`color` configuration, restricted to the three approved tomato labels. An immutable
release revision is not yet selected. The [original authors' paper](https://arxiv.org/pdf/1511.08060)
provides affirmative CC BY-SA 3.0 evidence and expressly covers trained algorithms;
there is no basis here to demand a separate blanket commercial-use permission before
assessing non-public educational development. The remaining question is **which exact
publisher release will be used, and whether its file coverage/terms are consistent with
that grant**, rather than whether PlantVillage has any declared license at all.

Practical next action within a future P2-01 continuation: inspect only the publisher's
release history and license/card at a candidate immutable revision, identify the color
release and any changed/additional terms, and make a narrow local-use selection decision.
The publisher metadata API and README commit-history page were inaccessible through the
browser research tool this turn, so no revision was guessed. No images or archives were
fetched. Do not create the P2-02 provenance manifest or split inventory in this decision
step. Exact current class counts, group/duplicate checks and actual image quality remain
unmeasured; scope approval is conditional and does not claim those checks passed.

**Pretrained artifact candidate:** backend/uv.lock currently resolves torch 2.14.1 and
torchvision 0.29.1 (read as TOML; nothing installed). The
[publisher's v0.29.1 source](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/torchvision/models/resnet.py)
identifies ResNet18_Weights.IMAGENET1K_V1 as
`https://download.pytorch.org/models/resnet18-f37072fd.pth`.
Only source text was viewed; the .pth URL was not opened and no checksum was measured.
The filename is an artifact identifier, not a verified full checksum.

The [versioned repository license](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/LICENSE)
is BSD 3-Clause for the software, while the
[official pretrained-model notice](https://docs.pytorch.org/vision/stable/models.html)
warns that model-specific/training-data terms may apply. The precise unresolved point
is **which license/access conditions govern this distributed .pth artifact for local
non-commercial educational loading and fine-tuning**, including any conditions on a
locally retained PlantVillage-fine-tuned artifact. The enum metadata reviewed does not
answer this expressly. That is an evidence gap, not proof of permission or prohibition.
ImageNet database terms are not automatically a license for every downstream weight.

Practical next action: inspect existing publisher weight-specific notices and the cited
ResNet training recipe/release documentation for this file, seeking an affirmative
applicable grant or clarification of the repository license's scope. No correspondence
is authorized. If the published evidence still does not establish the local use, record
that exact missing scope; propose an alternate artifact with explicit local educational
terms or a separate future clarification request. Do not automatically restart the broad
dataset comparison or substitute random initialization without discussing its changed
experiment. Blanket commercial deployment/redistribution clearance is not this local gate.

### Separate future public-release gate

Before a hosted API/Android release, assess the selected PlantVillage revision and exact
base/fine-tuned artifact for public inference, possible monetization, required attribution
placement and applicable ShareAlike treatment/compatibility. This is a specific future
use review, not an assertion that public API access is weight redistribution or that
server-only weights eliminate all obligations. Direct weight distribution and on-device
packaging are outside the initial release plan; reassess if that product choice changes.
Do not assume every surrounding application file must become ShareAlike, and do not
assume MIT on original application code overrides third-party artifact conditions.

P2-01 remains open: comparison and owner scope/use/license preference decisions are
recorded; the exact dataset release/local-use assessment and weight-specific local-use
terms remain unresolved. Public-release rights are explicitly deferred, not silently
cleared or imposed as a prerequisite for the current local assessment. No new owner
question is needed merely to repeat the three decisions already supplied.

Handoff: P2-01 owner decisions, owner codex-ml-decisions-20261029,
feat/backend-foundation / current checkout, base/current HEAD
ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; changes uncommitted. Changed only ml/README.md
and TASKS.md in this turn; all existing backend/research work preserved. Ownership
released with the above precise evidence gaps visible. No data/weights downloaded,
ML dependencies installed, training, correspondence, P2-02, commit or push.


Decision-record validation: with UV_CACHE_DIR=.cache/uv,
`uv run --project backend --locked --offline python scripts/check_foundation.py`
exited 0; `git diff --check` exited 0 (line-ending normalization warnings only).
No application/ML tests rerun for this documentation-only change. These checks validate
repository documentation consistency, not permissions, release identity or image quality.


## P2-01 exact-source evidence - October 29, 2026

This entry supersedes the unresolved release-identity question above. Owner decisions
remain unchanged: local education first, three tomato classes conditionally approved,
future hosted API/Android and possible monetization separately gated, no initial weight
distribution/on-device inference, MIT retained for original application code. No download,
training or P2-02 authorization is implied by selecting a metadata revision for review.

### Immutable author-linked PlantVillage color candidate

**Repository:** mohanty/PlantVillage. **Full revision:**
`9e97599868962bd0079b8db4b7f1efa9185fa1e7` (publisher metadata date
2026-02-05T22:17:46Z). Use its **color** representation and only the three approved labels.
The short hash from the [publisher commit history](https://huggingface.co/datasets/mohanty/PlantVillage/commits/main)
was resolved and rechecked using the
[revision-specific publisher API](https://huggingface.co/api/datasets/mohanty/PlantVillage/revision/9e97599868962bd0079b8db4b7f1efa9185fa1e7).
This is a repository revision, not a verified checksum of downloaded images.

Author publication linkage is recorded by the
[upstream author's README at Git commit 7f7ecc7e1eaca78107e3affe7cb5abd9427e139a](https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/7f7ecc7e1eaca78107e3affe7cb5abd9427e139a/README.md),
which recommends that Hugging Face repository and names the author/lab. The
[GitHub root tree](https://api.github.com/repos/spMohanty/PlantVillage-Dataset/git/trees/7f7ecc7e1eaca78107e3affe7cb5abd9427e139a)
and [CITATION.cff](https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/7f7ecc7e1eaca78107e3affe7cb5abd9427e139a/CITATION.cff)
were inspected as text/metadata; no image trees were fetched.

Release-specific notices inspected:

- The [pinned dataset card](https://huggingface.co/datasets/mohanty/PlantVillage/raw/9e97599868962bd0079b8db4b7f1efa9185fa1e7/README.md)
  declares cc-by-sa-3.0, describes color as original RGB, lists the approved labels and
  cites Mohanty, Hughes and Salathe (2016), DOI 10.3389/fpls.2016.01419. It names Sharada
  Mohanty, Marcel Salathe and Digital Epidemiology Lab, EPFL. Those are publisher notices,
  not independent inspection of image contents or individual author rights.
- The revision API lists README.md, plant_village.py, .gitattributes, data.zip,
  leaf_grouping/leaf-map.json and six color/grayscale/segmented split files. There is no
  separately named LICENSE/NOTICE file in that exposed repository file list. The GitHub
  root tree likewise has no root LICENSE/NOTICE. This does not establish what notices
  might be inside data.zip, which was deliberately not downloaded or opened.
- The [pinned loader source](https://huggingface.co/datasets/mohanty/PlantVillage/raw/9e97599868962bd0079b8db4b7f1efa9185fa1e7/plant_village.py)
  has an Apache-2.0 code header. Its dataset _LICENSE is CC BY-SA 3.0, but an adjacent
  comment describes that value as an assumption to verify. Do not use that comment as
  the sole rights evidence or apply Apache-2.0 to the photographs. It hardcodes resource
  URLs to resolve/main; merely pinning loader code would not pin its resource retrieval.
  Future ingestion must bind every resource to the reviewed revision; no loader was run.

Applicable linked publisher/license evidence:

- [Hughes and Salathe's original dataset paper, PDF page 7](https://arxiv.org/pdf/1511.08060)
  affirmatively releases the data under CC BY-SA 3.0 and expressly applies the same license
  to trained algorithms. This plus the release card establishes the declared-license basis
  for assessing a local educational experiment, rather than requiring hypothetical blanket
  commercial clearance. It is not a guarantee of all underlying rights or artifact compatibility.
- [CC BY-SA 3.0 legal text, sections 3 and 4](https://creativecommons.org/licenses/by-sa/3.0/legalcode.en):
  preserve supplied author/title/copyright/license notices, link the source and license,
  identify modifications, and use the applicable ShareAlike license for distributed/publicly
  performed adaptations. No NonCommercial condition appears in this license. Record
  attribution from supplied notices; do not infer that scientific citation alone satisfies
  every applicable condition. This does not automatically relicense separate original app code.
- The linked [2016 Frontiers paper](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2016.01419/full)
  has its own CC BY article copyright notice. It is not a replacement CC BY grant for the
  dataset or a cancellation of the dataset authors' trained-algorithm clarification.

Proposed attribution content for later applicable use: PlantVillage dataset, credited to
Sharada P. Mohanty, David P. Hughes and Marcel Salathe with the supplied EPFL/lab credit;
source repository plus full revision above; CC BY-SA 3.0 link; citation to the 2016
classification paper and original dataset paper; identify HORTI's three-class subset and
any later transformations. Retain any additional notices encountered during a separately
authorized inspection. This is a selection-stage attribution plan, not a P2-02 manifest.

**Resolved:** exact author-linked repository revision and its exposed declarations.
**Still conditional:** no current file counts, duplicate/leaf-group quality, archive-internal
notices or image integrity measured. The authors' same-license trained-algorithm statement
must be carried forward, not silently reduced to an image-only obligation. Whether the
combined fine-tuned artifact can satisfy that statement depends on the base weight terms
below. Public-service treatment remains a separate future gate; it does not block merely
assessing local use. No additional dataset-specific local prohibition was demonstrated.

### Exact ResNet18 artifact: what the publisher evidence does and does not establish

Candidate: **resnet18-f37072fd.pth**, referenced by
**ResNet18_Weights.IMAGENET1K_V1 in torchvision v0.29.1** (the current optional lock).
The [versioned publisher source](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/torchvision/models/resnet.py)
binds that enum to https://download.pytorch.org/models/resnet18-f37072fd.pth and a ResNet
recipe link. The binary URL was not requested, no headers/checksum of the .pth measured,
and no model instantiated. Its filename hash fragment is not a verified full checksum.

Evidence inspected, kept distinct:

- [v0.29.1 LICENSE](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/LICENSE)
  grants BSD 3-Clause software use/redistribution with notice/disclaimer and endorsement
  conditions. It does not explicitly identify this separately hosted .pth by name.
- [v0.29.1 README, Pre-trained Model License](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/README.md)
  and [v0.29.1 model documentation source](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/docs/source/models.rst)
  warn that pretrained models may have their own training-data-derived terms. The README's
  specific SWAG restriction concerns another model family; it neither grants nor prohibits
  the selected ResNet18 use. No ResNet18-specific license is stated in the inspected notices.
- [v0.29.1 classification recipe](https://raw.githubusercontent.com/pytorch/vision/v0.29.1/references/classification/README.md)
  describes research training procedures, but supplies no separate weight-use grant.
  [The publisher's transfer-learning tutorial](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html)
  demonstrates pretrained ResNet18 transfer learning and its rendered download output names
  this exact resnet18-f37072fd.pth file. This is affirmative evidence of the
  publisher's documented technical use, not a substitute for resolving applicable license scope.
- [ImageNet's database download terms](https://ftp.image-net.org/download) describe
  non-commercial research/education in original-site search results. Direct retrieval of
  that page, /download.php and /download-images.php timed out through the inspected routes.
  Full current terms were not verified this turn. Database access terms are not automatically
  an express grant for this downstream weight binary, nor proof that every such binary is
  prohibited for other uses. No ImageNet access/account/data retrieval is needed here.

**Precise remaining local-use question:** does the applicable publisher grant for
resnet18-f37072fd.pth cover non-public educational loading/fine-tuning and retention of the
resulting weights, and are there additional artifact-specific conditions affecting a
PlantVillage CC BY-SA fine-tuned artifact? The reviewed source, technical tutorial and
BSD software license support the proposed workflow technically but do not conclusively
resolve that license-scope question. Absence of a separate notice is not permission or
prohibition. No blanket commercial or weight-redistribution clearance is demanded now.

### Practical next action and unsent clarification draft

The smallest remaining rights action is a targeted publisher clarification for the exact
weight file's local educational use and applicable license scope. Inspect any authoritative
existing answer first, or request one only after separate authorization. Do not repeat
the dataset comparison. If a contrary/additional condition is identified, assess just its
compatibility with the declared PlantVillage trained-algorithm condition. Dataset publisher
clarification is needed only for a concrete remaining conflict or artifact-scope ambiguity,
not as a new blanket precondition to considering an openly licensed local experiment.

Unsent draft to Torchvision/PyTorch maintainers (not submitted):

> I am evaluating local, non-commercial undergraduate transfer learning using
> ResNet18_Weights.IMAGENET1K_V1, file resnet18-f37072fd.pth distributed at
> download.pytorch.org/models and referenced by torchvision v0.29.1. Could you point to
> the license/terms governing this particular weight artifact, and confirm whether they
> cover local loading, fine-tuning and retaining the resulting weights without public
> service or redistribution? Does the repository BSD-3-Clause grant cover the binary,
> or do additional terms apply? The target PlantVillage dataset declares CC BY-SA 3.0
> for trained algorithms; are there base-weight conditions relevant to that compatibility?
> Future public inference/commercial use is a separate review; no such clearance is
> requested for this local experiment.

P2-01 remains **open** for that specific weight-license/local-use and resulting-artifact
compatibility question. Dataset revision identity is now evidenced; owner product choices
are already recorded. Data-quality conditions remain unmeasured and public release remains
separately gated. No evidence supports marking all selection acceptance complete yet.

Retrieval note: read-only Python urllib requests obtained publisher API JSON, README,
loader/citation/license/recipe text where browser access failed. Requested URLs are all
listed above; no image, zip, split contents, leaf-map contents or weight URL was fetched.
Metadata lists containing data filenames are not downloads of those files. No supporting
scripts/files were retained and no code from the dataset loader was executed.

Handoff: owner codex-ml-rights-20261029; feat/backend-foundation / current checkout;
base/current HEAD ccd7619fe97c98b4825f1ba3e16938a04bf1b00a; uncommitted. Changed only
ml/README.md and TASKS.md this turn. Pre-existing backend/docs/research changes preserved.
Ownership released with P2-01 incomplete and exact blocker recorded. No correspondence,
images/archives/weights, dependency installation, training, P2-02, commit or push.


Exact-source validation: from repository root with UV_CACHE_DIR=.cache/uv,
`uv run --project backend --locked --offline python scripts/check_foundation.py` exited 0
(Foundation syntax, local links, and task IDs validated); `git diff --check` exited 0
with line-ending normalization warnings only. No runtime or ML tests were rerun for
this documentation-only research. These checks establish neither artifact permission
nor dataset quality. Some browser metadata endpoints failed; read-only urllib text/JSON
retrieval succeeded without escalation for Hugging Face/GitHub. ImageNet host timeouts
remain an access limitation, not evidence about downstream weight permissions.
