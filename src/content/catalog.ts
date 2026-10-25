/**
 * Every label on the public website, grouped by page and then by block, with its default wording.
 * Admins change or hide them in Admin -> Settings -> Site text; only their changes are stored.
 *
 * Words in {curly braces} are filled in by the site (a name, a count, ...) and should be kept.
 * Fields marked `required` can be reworded but not hidden (the page needs them to work).
 */

export interface TextField {
  key: string;
  /** What the admin sees */
  label: string;
  default: string;
  multiline?: boolean;
  required?: boolean;
  /** Extra hint in the admin */
  help?: string;
}

export interface TextBlock {
  id: string;
  name: string;
  /** Where it appears, shown in the admin */
  where?: string;
  fields: TextField[];
}

export interface TextGroup {
  id: string;
  name: string;
  /** A page to open for a preview */
  path?: string;
  note?: string;
  blocks: TextBlock[];
}

type Opts = Partial<Pick<TextField, "multiline" | "required" | "help">>;
const f = (key: string, label: string, value: string, opts: Opts = {}): TextField => ({ key, label, default: value, ...opts });
const COUNT = "{count} is replaced with the number";

export const TEXT_GROUPS: TextGroup[] = [
  {
    id: "shared",
    name: "Used on several pages",
    note: "These blocks appear on more than one page, so a change here shows everywhere they're used.",
    blocks: [
      {
        id: "header",
        name: "Header menu",
        where: "Top of every page",
        fields: [
          f("shared.header.projects", "Menu link: projects", "Projects"),
          f("shared.header.builders", "Menu link: builders", "Builders"),
          f("shared.header.news", "Menu link: news", "News"),
          f("shared.header.about", "Menu link: about", "About"),
          f("shared.header.saved", "Menu link: saved projects", "Saved ({count})", { help: COUNT }),
          f("shared.header.signIn", "Sign-in button", "Sign in"),
          f("shared.header.account", "Account button (when the name is unknown)", "My account", { required: true }),
          f("shared.header.signedIn", "Account menu: heading when the name is unknown", "Signed in", { required: true }),
          f("shared.header.accountSaved", "Account menu: saved projects", "Saved projects", { required: true }),
          f("shared.header.signOut", "Account menu: sign out", "Sign out", { required: true }),
          f("shared.header.signedOut", "Message after signing out", "Signed out", { required: true }),
        ],
      },
      {
        id: "footer",
        name: "Footer",
        where: "Bottom of every page",
        fields: [
          f("shared.footer.rera", "RERA line (before the number)", "RERA registration:"),
          f("shared.footer.exploreTitle", "Links column: heading", "Explore"),
          f("shared.footer.linkProjects", "Link: all projects", "All projects"),
          f("shared.footer.linkBuilders", "Link: builders", "Builders"),
          f("shared.footer.linkNews", "Link: news", "News"),
          f("shared.footer.linkAbout", "Link: about", "About us"),
          f("shared.footer.linkSaved", "Link: saved projects", "Saved projects"),
          f("shared.footer.linkCompare", "Link: compare", "Compare projects"),
          f("shared.footer.contactTitle", "Contact column: heading", "Talk to us"),
          f("shared.footer.whatsapp", "Contact column: WhatsApp link", "WhatsApp us"),
          f("shared.footer.whatsappMessage", "WhatsApp message the visitor starts with", "Hi, I'd like help finding a home.", { required: true }),
          f("shared.footer.copyright", "Copyright line", "© {year} {company}. All rights reserved.", { help: "{year} and {company} are filled in" }),
          f("shared.footer.disclaimer", "Disclaimer", "Prices and availability are indicative and set by the builders. Please confirm before booking.", { multiline: true }),
        ],
      },
      {
        id: "whatsapp",
        name: "Floating WhatsApp button",
        where: "Bottom-right corner of every page",
        fields: [
          f("shared.whatsapp.label", "Button text (desktop)", "Chat with us"),
          f("shared.whatsapp.message", "Message the visitor starts with", "Hi, I'd like help finding a home.", { required: true }),
          f("shared.whatsapp.projectMessage", "Message on a project page", "Hi, I'm interested in a project I saw on your website: {link}", { required: true, help: "{link} is the project page" }),
        ],
      },
      {
        id: "search",
        name: "Search box",
        where: "Home page banner and projects page",
        fields: [
          f("shared.search.placeholder", "Placeholder", "Area, city, project or builder", { required: true }),
          f("shared.search.city", "Suggestion type: city", "City", { required: true }),
          f("shared.search.area", "Suggestion type: area", "Area in {city}", { required: true }),
          f("shared.search.project", "Suggestion type: project", "Project", { required: true }),
          f("shared.search.builder", "Suggestion type: builder", "Builder", { required: true }),
          f("shared.search.countOne", "Number of projects (one)", "1 project", { required: true }),
          f("shared.search.countMany", "Number of projects (more than one)", "{count} projects", { required: true, help: COUNT }),
        ],
      },
      {
        id: "card",
        name: "Project card",
        where: "Home, projects, builder and saved pages",
        fields: [
          f("shared.card.hot", "Hot badge", "Hot"),
          f("shared.card.rera", "RERA badge", "RERA"),
          f("shared.card.bhk", "Bedrooms", "{value} BHK", { required: true }),
          f("shared.card.by", "Builder line", "by {builder}", { required: true }),
          f("shared.card.view", "Button", "View details", { required: true }),
          f("shared.card.compareAdd", "Compare button tooltip", "Add to comparison", { required: true }),
          f("shared.card.compareRemove", "Compare button tooltip (added)", "Remove from comparison", { required: true }),
        ],
      },
      {
        id: "saveMessages",
        name: "Saving a project",
        where: "Messages after tapping the heart",
        fields: [
          f("shared.save.savedGuest", "Saved (not signed in)", "Saved on this device", { required: true }),
          f("shared.save.savedGuestHint", "Saved (not signed in): second line", "Sign in to see it on your other devices too.", { required: true }),
          f("shared.save.signIn", "Saved (not signed in): button", "Sign in", { required: true }),
          f("shared.save.saved", "Saved (signed in)", "Saved to your list", { required: true }),
          f("shared.save.removed", "Removed", "Removed from saved projects", { required: true }),
        ],
      },
      {
        id: "compareBar",
        name: "Compare bar",
        where: "Bottom of the screen after adding projects to compare",
        fields: [
          f("shared.compareBar.picked", "Count", "{count} of {max} picked", { required: true }),
          f("shared.compareBar.pickMore", "Hint when only one is picked", ": pick one more to compare"),
          f("shared.compareBar.button", "Button", "Compare", { required: true }),
        ],
      },
      {
        id: "enquiry",
        name: "Site visit and information form",
        where: "Pop-up on project pages",
        fields: [
          f("shared.enquiry.visitTitle", "Title: site visit", "Schedule a site visit", { required: true }),
          f("shared.enquiry.infoTitle", "Title: more information", "Get more information", { required: true }),
          f("shared.enquiry.name", "Name label", "Your name", { required: true }),
          f("shared.enquiry.phone", "Phone label", "Phone number", { required: true }),
          f("shared.enquiry.email", "Email label", "Email (optional)", { required: true }),
          f("shared.enquiry.date", "Date label (site visit)", "Preferred date (optional)", { required: true }),
          f("shared.enquiry.message", "Message label", "Message (optional)", { required: true }),
          f("shared.enquiry.infoMessage", "Message filled in for information requests", "I'd like more details about {project}: pricing, floor plans and availability.", { multiline: true }),
          f("shared.enquiry.visitSubmit", "Button: site visit", "Request site visit", { required: true }),
          f("shared.enquiry.infoSubmit", "Button: information", "Send request", { required: true }),
          f("shared.enquiry.privacy", "Note under the button", "We'll only use your details to contact you about this project."),
          f("shared.enquiry.thanksTitle", "Thank-you title", "Thank you, {name}!", { required: true }),
          f("shared.enquiry.visitThanks", "Thank-you text: site visit", "Our team will call you on {phone} to confirm your visit to {project}.", { multiline: true }),
          f("shared.enquiry.infoThanks", "Thank-you text: information", "Our team will call you on {phone} with details about {project}.", { multiline: true }),
          f("shared.enquiry.close", "Close button", "Close", { required: true }),
        ],
      },
      {
        id: "signIn",
        name: "Sign-in pop-up",
        where: "Header, saved projects and after saving a project",
        fields: [
          f("shared.signIn.title", "Title", "Sign in with your phone", { required: true }),
          f("shared.signIn.intro", "Text under the title", "Keep your saved projects on every device. No password needed: we'll text you a code.", { multiline: true }),
          f("shared.signIn.phone", "Mobile number label", "Mobile number", { required: true }),
          f("shared.signIn.name", "Name label", "Your name (optional)", { required: true }),
          f("shared.signIn.send", "Button: send code", "Send code", { required: true }),
          f("shared.signIn.privacy", "Note under the button", "We'll only use your number for your account and replies to your enquiries."),
          f("shared.signIn.codeTitle", "Title: enter the code", "Enter the code", { required: true }),
          f("shared.signIn.codeSent", "Text: code sent", "We sent a code by SMS to {phone}.", { required: true }),
          f("shared.signIn.code", "Code label", "Code", { required: true }),
          f("shared.signIn.verify", "Button: verify", "Verify and sign in", { required: true }),
          f("shared.signIn.changeNumber", "Link: change number", "Change number", { required: true }),
          f("shared.signIn.resend", "Link: resend", "Resend code", { required: true }),
          f("shared.signIn.resendIn", "Resend countdown", "Resend in {seconds}s", { required: true }),
          f("shared.signIn.welcome", "Signed-in message", "Welcome, {name}!", { required: true }),
          f("shared.signIn.welcomeNoName", "Signed-in message (name unknown)", "You're signed in", { required: true }),
          f("shared.signIn.welcomeHint", "Signed-in message: second line", "Projects you save will be on your account on any device.", { required: true }),
        ],
      },
      {
        id: "expertForm",
        name: "\"Let our experts help\" form",
        where: "Home, projects and builders pages",
        fields: [
          f("shared.expert.title", "Heading", "Let our experts find the right home for you", { required: true }),
          f("shared.expert.intro", "Text under the heading", "Tell us what you're looking for. We'll shortlist matching projects and call you back.", { multiline: true }),
          f("shared.expert.point1Title", "Point 1: bold part", "Free of charge."),
          f("shared.expert.point1Text", "Point 1: text", "We charge zero commission or brokerage."),
          f("shared.expert.point2Title", "Point 2: bold part", "RERA-registered projects,"),
          f("shared.expert.point2Text", "Point 2: text", "with the details on every listing."),
          f("shared.expert.point3Title", "Point 3: bold part", "One person to talk to,"),
          f("shared.expert.point3Text", "Point 3: text", "from site visits to home-loan help."),
          f("shared.expert.step1", "Step 1 name", "What you're looking for", { required: true }),
          f("shared.expert.step2", "Step 2 name", "How we can reach you", { required: true }),
          f("shared.expert.stepOf", "Step counter", "Step {step} of 2", { required: true }),
          f("shared.expert.type", "Property type label", "Property type", { required: true }),
          f("shared.expert.types", "Property types (one per line)", "Apartments\nVillas\nPlots", { multiline: true, required: true }),
          f("shared.expert.budget", "Budget label", "Budget", { required: true }),
          f("shared.expert.budgets", "Budgets (one per line)", "Under 80L\n80L - 1Cr\n1 - 1.5Cr\n1.5 - 2Cr\n2 - 2.5Cr\n2.5 - 3Cr\n3 - 4Cr\n4Cr+", { multiline: true, required: true }),
          f("shared.expert.location", "Location label", "Preferred location", { required: true }),
          f("shared.expert.locationPlaceholder", "Location placeholder", "City or area, e.g. Kakkanad, Kochi"),
          f("shared.expert.next", "Button: next", "Next", { required: true }),
          f("shared.expert.name", "Name label", "Your name", { required: true }),
          f("shared.expert.phone", "Mobile label", "Mobile number", { required: true }),
          f("shared.expert.email", "Email label", "Email", { required: true }),
          f("shared.expert.optional", "\"(optional)\" note", "(optional)"),
          f("shared.expert.loan", "Home-loan question", "Need help with a home loan?", { required: true }),
          f("shared.expert.loanYes", "Answer: yes", "Yes", { required: true }),
          f("shared.expert.loanNo", "Answer: no", "No", { required: true }),
          f("shared.expert.loanUnsure", "Answer: not sure", "Not sure", { required: true }),
          f("shared.expert.back", "Button: back", "Back", { required: true }),
          f("shared.expert.submit", "Button: submit", "Get a call back", { required: true }),
          f("shared.expert.privacy", "Note under the button", "We'll only use your details to help with your home search."),
          f("shared.expert.thanksTitle", "Thank-you title", "Thank you, {name}!", { required: true }),
          f("shared.expert.thanksText", "Thank-you text", "Our expert will call you on {phone} with projects that match {type} in {location} ({budget}).", { multiline: true }),
          f("shared.expert.browse", "Thank-you button: browse", "Browse projects meanwhile"),
          f("shared.expert.another", "Thank-you button: another request", "Send another request"),
        ],
      },
      {
        id: "newsletter",
        name: "Newsletter sign-up",
        where: "Home and news pages",
        fields: [
          f("shared.newsletter.title", "Heading", "Stay updated", { required: true }),
          f("shared.newsletter.text", "Text", "New project launches, price updates and offers, straight to your inbox. No spam.", { multiline: true }),
          f("shared.newsletter.name", "Name placeholder", "Your name (optional)", { required: true }),
          f("shared.newsletter.email", "Email placeholder", "Email address", { required: true }),
          f("shared.newsletter.button", "Button", "Subscribe", { required: true }),
          f("shared.newsletter.note", "Note", "You can unsubscribe anytime via a link in our emails."),
          f("shared.newsletter.done", "Message after subscribing", "Subscribed!", { required: true }),
          f("shared.newsletter.already", "Message when already subscribed", "This email is already on our list.", { required: true }),
        ],
      },
      {
        id: "testimonials",
        name: "Testimonials",
        where: "Home page",
        fields: [
          f("shared.testimonials.title", "Heading", "What our clients say"),
          f("shared.testimonials.subtitle", "Text under the heading", "Families and investors who found their home with us"),
          f("shared.testimonials.verified", "Badge on testimonials with a letter or note", "Verified client"),
          f("shared.testimonials.viewLetter", "Link to a PDF letter", "View original letter (PDF)", { required: true }),
          f("shared.testimonials.viewNote", "Link to a photo of a note", "View original note", { required: true }),
          f("shared.testimonials.noteFrom", "Title of the note viewer", "Note from {name}", { required: true }),
        ],
      },
    ],
  },
  {
    id: "home",
    name: "Home page",
    path: "/",
    note: "The banner's heading, description and the three numbers are set in Settings -> Landing page banner.",
    blocks: [
      {
        id: "banner",
        name: "Banner",
        fields: [f("home.banner.button", "Search button", "Search Properties", { required: true })],
      },
      {
        id: "featured",
        name: "Hot projects",
        fields: [
          f("home.featured.badge", "Small label above the heading", "Hot Projects"),
          f("home.featured.title", "Heading", "Featured Premium Projects"),
          f("home.featured.subtitle", "Text under the heading", "Discover our handpicked selection of exceptional properties with exclusive amenities and prime locations", { multiline: true }),
          f("home.featured.viewAll", "Button under the projects", "View All Projects"),
        ],
      },
      {
        id: "browse",
        name: "Browse by location",
        fields: [
          f("home.browse.eyebrow", "Small label above the heading", "Explore"),
          f("home.browse.title", "Heading", "Browse by location"),
          f("home.browse.subtitle", "Text under the heading", "Find projects in the city you want to live in."),
          f("home.browse.typePlural", "Property type links", "{type}s", { required: true, help: "e.g. \"Apartments\"; {type} is the type" }),
          f("home.browse.countOne", "Tile: one project", "1 project", { required: true }),
          f("home.browse.countMany", "Tile: several projects", "{count} projects", { required: true, help: COUNT }),
          f("home.browse.view", "Tile link (desktop)", "View projects"),
        ],
      },
      {
        id: "whyUs",
        name: "Why buy with us",
        fields: [
          f("home.why.eyebrow", "Small label above the heading", "Why buy with us"),
          f("home.why.title", "Heading", "Buying a home, made simpler"),
          f("home.why.p1Title", "Card 1: title", "Zero brokerage"),
          f("home.why.p1Text", "Card 1: text", "Our help is free for home buyers. You pay the builder's price, nothing on top.", { multiline: true }),
          f("home.why.p2Title", "Card 2: title", "RERA-registered projects"),
          f("home.why.p2Text", "Card 2: text", "Every listing shows its RERA number, so you can check the project yourself.", { multiline: true }),
          f("home.why.p3Title", "Card 3: title", "Site visits arranged"),
          f("home.why.p3Text", "Card 3: text", "Pick a date and we'll set up the visit with the builder's team.", { multiline: true }),
          f("home.why.p4Title", "Card 4: title", "Home-loan help"),
          f("home.why.p4Text", "Card 4: text", "We'll connect you with lenders and help you compare offers.", { multiline: true }),
        ],
      },
      {
        id: "builders",
        name: "Builder logos",
        fields: [
          f("home.builders.eyebrow", "Small label above the heading", "Our partners"),
          f("home.builders.title", "Heading", "Builders we work with"),
          f("home.builders.all", "Link to all builders", "All builders"),
        ],
      },
    ],
  },
  {
    id: "projects",
    name: "Projects page",
    path: "/projects",
    blocks: [
      {
        id: "banner",
        name: "Banner",
        fields: [
          f("projects.banner.title", "Heading", "Browse Properties", { required: true }),
          f("projects.banner.subtitle", "Text under the heading", "Discover your perfect home from our collection of premium properties"),
        ],
      },
      {
        id: "filters",
        name: "Filters",
        fields: [
          f("projects.filters.button", "Filters button (phones)", "Filters", { required: true }),
          f("projects.filters.panelTitle", "Filters panel title (phones)", "Filters", { required: true }),
          f("projects.filters.allTypes", "Type filter: all", "All Project Types", { required: true }),
          f("projects.filters.allLocations", "Location filter: all", "All Locations", { required: true }),
          f("projects.filters.allStatus", "Status filter: all", "All Status", { required: true }),
          f("projects.filters.allBedrooms", "Bedrooms filter: all", "All Bedrooms", { required: true }),
          f("projects.filters.allBuilders", "Builder filter: all", "All Builders", { required: true }),
          f("projects.filters.budget", "Budget slider label", "Budget", { required: true }),
          f("projects.filters.reset", "Reset button", "Reset filters", { required: true }),
          f("projects.filters.clearAll", "Clear all", "Clear all", { required: true }),
          f("projects.filters.show", "Panel button (phones)", "Show {count} projects", { required: true, help: COUNT }),
        ],
      },
      {
        id: "results",
        name: "Results",
        fields: [
          f("projects.results.countOne", "Count: one", "{count} project", { required: true }),
          f("projects.results.countMany", "Count: several", "{count} projects", { required: true }),
          f("projects.results.of", "Count when filtered", "of {total}", { required: true }),
          f("projects.results.sortNewest", "Sort: newest", "Newest first", { required: true }),
          f("projects.results.sortName", "Sort: name", "Name A–Z", { required: true }),
          f("projects.results.emptyTitle", "No results: title", "No Properties Found", { required: true }),
          f("projects.results.emptyText", "No results: text", "Try adjusting your filters or search query to find more properties."),
          f("projects.results.emptyButton", "No results: button", "Clear All Filters", { required: true }),
          f("projects.results.errorTitle", "Couldn't load: title", "Couldn't load properties", { required: true }),
          f("projects.results.retry", "Couldn't load: button", "Retry", { required: true }),
        ],
      },
    ],
  },
  {
    id: "project",
    name: "Project page",
    path: "/projects",
    note: "Open any project to preview.",
    blocks: [
      {
        id: "banner",
        name: "Banner",
        fields: [
          f("project.banner.hot", "Hot badge", "🔥 Hot Project"),
          f("project.banner.photos", "Photos button", "{count} photos", { required: true, help: COUNT }),
          f("project.banner.save", "Save button (screen readers)", "Save this project", { required: true }),
          f("project.banner.unsave", "Saved button (screen readers)", "Remove from saved projects", { required: true }),
          f("project.banner.loading", "While loading", "Loading property...", { required: true }),
          f("project.banner.notFound", "Project not found: heading", "Property Not Found", { required: true }),
          f("project.banner.notFoundText", "Project not found: text", "The property you're looking for doesn't exist."),
          f("project.banner.goBack", "Go back button", "Go Back", { required: true }),
        ],
      },
      {
        id: "tabs",
        name: "Tabs",
        fields: [
          f("project.tabs.overview", "Tab: overview", "Overview", { required: true }),
          f("project.tabs.gallery", "Tab: gallery", "Gallery", { required: true }),
          f("project.tabs.floorPlans", "Tab: floor plans", "Floor Plans", { required: true }),
          f("project.tabs.amenities", "Tab: amenities", "Amenities", { required: true }),
          f("project.tabs.location", "Tab: location", "Location", { required: true }),
          f("project.tabs.builder", "Tab: builder", "Builder", { required: true }),
        ],
      },
      {
        id: "overview",
        name: "Overview tab",
        fields: [
          f("project.overview.title", "Heading", "Project Overview"),
          f("project.overview.location", "Location", "Location", { required: true }),
          f("project.overview.price", "Price range", "Price Range", { required: true }),
          f("project.overview.status", "Status", "Status", { required: true }),
          f("project.overview.developmentSize", "Development size", "Development Size", { required: true }),
          f("project.overview.unitSize", "Unit size", "Unit Size", { required: true }),
          f("project.overview.totalUnits", "Total units", "Total Units", { required: true }),
          f("project.overview.towers", "Towers and blocks", "Towers and Blocks", { required: true }),
          f("project.overview.variants", "Unit variants", "Unit Variants", { required: true }),
          f("project.overview.possession", "Possession time", "Possession Time", { required: true }),
          f("project.overview.bedrooms", "Bedrooms", "Bedrooms", { required: true }),
          f("project.overview.bathrooms", "Bathrooms", "Bathrooms", { required: true }),
          f("project.overview.completion", "Completion", "Completion", { required: true }),
          f("project.overview.extra", "Sentence after the description", "This exceptional project by {builder} offers modern living with premium amenities and strategic location advantages.", { multiline: true }),
        ],
      },
      {
        id: "floorPlans",
        name: "Floor plans tab",
        fields: [
          f("project.floorPlans.title", "Heading", "Floor Plans"),
          f("project.floorPlans.subtitle", "Text under the heading", "Explore the configurations available for this project."),
          f("project.floorPlans.countOne", "Count: one", "1 option", { required: true }),
          f("project.floorPlans.countMany", "Count: several", "{count} options", { required: true }),
          f("project.floorPlans.option", "Name of a plan with no name", "Option {number}", { required: true }),
          f("project.floorPlans.configuration", "Small label above the plan name", "Configuration"),
          f("project.floorPlans.planOf", "Plan counter", "Plan {number} of {count}", { required: true }),
          f("project.floorPlans.noImage", "No image: title", "Floor plan preview coming soon"),
          f("project.floorPlans.noImageHint", "No image: text", "Upload a high-resolution image to showcase this layout."),
          f("project.floorPlans.none", "No floor plans", "No floor plans available.", { required: true }),
        ],
      },
      {
        id: "amenities",
        name: "Amenities tab",
        fields: [f("project.amenities.title", "Heading", "Amenities & Features")],
      },
      {
        id: "location",
        name: "Location tab",
        fields: [
          f("project.location.title", "Heading", "Location & Connectivity"),
          f("project.location.address", "Address label", "Address"),
          f("project.location.openMaps", "Map link", "Open in Google Maps"),
          f("project.location.noMap", "No map: text", "Interactive Map Coming Soon"),
          f("project.location.searchMaps", "No map: link", "Search this location in Google Maps"),
        ],
      },
      {
        id: "gallery",
        name: "Gallery tab",
        fields: [
          f("project.gallery.mediaTitle", "Video and tour: heading", "Video and virtual tour"),
          f("project.gallery.watchVideo", "Video button (non-YouTube links)", "Watch the walkthrough video", { required: true }),
          f("project.gallery.openTour", "Virtual tour button", "Open the 3D virtual tour", { required: true }),
          f("project.gallery.title", "Photos: heading", "Photo Gallery"),
          f("project.gallery.hint", "Photos: hint", "Swipe or use the arrows to browse. Tap a photo to see it full screen."),
          f("project.gallery.none", "No photos", "No images available", { required: true }),
        ],
      },
      {
        id: "builder",
        name: "Builder tab",
        fields: [
          f("project.builder.title", "Heading", "Builder Profile"),
          f("project.builder.experience", "Experience", "Experience: {years} years"),
          f("project.builder.rating", "Rating", "Rating: {rating} / 5"),
          f("project.builder.noDescription", "No description", "Builder description is not available."),
          f("project.builder.website", "Website label", "Website:"),
          f("project.builder.phone", "Phone label", "Phone:"),
          f("project.builder.email", "Email label", "Email:"),
        ],
      },
      {
        id: "sidebar",
        name: "Price card",
        where: "Right side on desktop, below the tabs on phones",
        fields: [
          f("project.side.builtBy", "Small label above the builder", "Built by"),
          f("project.side.rera", "RERA label", "RERA No."),
          f("project.side.developmentSize", "Development size", "Development Size: {value}", { required: true }),
          f("project.side.unitSize", "Unit size", "Unit Size: {value}", { required: true }),
          f("project.side.totalUnits", "Total units", "Total Units: {value}", { required: true }),
          f("project.side.brochure", "Button: brochure", "Download Brochure", { required: true }),
          f("project.side.noBrochure", "No brochure note", "Brochure not available for this property yet."),
          f("project.side.whatsapp", "Button: WhatsApp", "Chat on WhatsApp"),
          f("project.side.visit", "Button: site visit", "Schedule Site Visit"),
          f("project.side.info", "Button: more info", "Get More Info"),
          f("project.side.compareAdd", "Button: compare", "Add to comparison"),
          f("project.side.compareRemove", "Button: compare (added)", "Remove from comparison", { required: true }),
          f("project.side.whatsappMessage", "WhatsApp message the visitor starts with", "Hi, I'm interested in {project}. Please share more details.", { required: true }),
        ],
      },
      {
        id: "mobileBar",
        name: "Bottom bar on phones",
        fields: [
          f("project.bar.call", "Call", "Call"),
          f("project.bar.whatsapp", "WhatsApp", "WhatsApp"),
          f("project.bar.visit", "Site visit", "Site visit"),
          f("project.bar.brochure", "Brochure", "Brochure", { required: true }),
          f("project.bar.enquire", "Enquire (when there's no brochure)", "Enquire", { required: true }),
        ],
      },
      {
        id: "emi",
        name: "EMI calculator",
        fields: [
          f("project.emi.title", "Heading", "EMI calculator"),
          f("project.emi.subtitle", "Text under the heading", "See what your monthly home-loan payment could be for this project."),
          f("project.emi.price", "Property price", "Property price", { required: true }),
          f("project.emi.down", "Down payment", "Down payment", { required: true }),
          f("project.emi.rate", "Interest rate", "Interest rate (%)", { required: true }),
          f("project.emi.term", "Term", "Term (years)", { required: true }),
          f("project.emi.monthly", "Result label", "Monthly EMI", { required: true }),
          f("project.emi.loan", "Loan", "Loan", { required: true }),
          f("project.emi.interest", "Total interest", "Total interest", { required: true }),
          f("project.emi.total", "Total paid", "Total paid", { required: true }),
          f("project.emi.note", "Small print", "An estimate only. Your bank's rate, fees and eligibility decide the actual EMI.", { multiline: true }),
          f("project.emi.help", "Button", "Get home-loan help"),
        ],
      },
      {
        id: "brochure",
        name: "Brochure download pop-up",
        fields: [
          f("project.brochure.title", "Title", "Download Brochure", { required: true }),
          f("project.brochure.intro", "Text", "Enter your phone number to receive an OTP.", { required: true }),
          f("project.brochure.phone", "Phone placeholder", "Phone number", { required: true }),
          f("project.brochure.send", "Button: send", "Send OTP", { required: true }),
          f("project.brochure.sending", "Button while sending", "Sending…", { required: true }),
          f("project.brochure.sent", "Text after sending", "Enter the OTP sent to {phone}.", { required: true }),
          f("project.brochure.otp", "OTP placeholder", "6-digit OTP", { required: true }),
          f("project.brochure.back", "Button: back", "Back", { required: true }),
          f("project.brochure.verify", "Button: verify", "Verify & Download", { required: true }),
          f("project.brochure.verifying", "Button while verifying", "Verifying…", { required: true }),
        ],
      },
    ],
  },
  {
    id: "builders",
    name: "Builders pages",
    path: "/builders",
    blocks: [
      {
        id: "banner",
        name: "Banner (builders list)",
        fields: [
          f("builders.banner.title", "Heading", "Builders", { required: true }),
          f("builders.banner.subtitle", "Text under the heading", "Explore all builders and their listed projects."),
        ],
      },
      {
        id: "list",
        name: "Builder cards",
        fields: [
          f("builders.list.projects", "Number of projects", "{count} projects", { required: true }),
          f("builders.list.experience", "Experience", "{years} yrs experience"),
          f("builders.list.rating", "Rating", "{rating}/5 rating"),
          f("builders.list.emptyTitle", "No builders: title", "No builders found", { required: true }),
          f("builders.list.emptyText", "No builders: text", "Please check back soon for listed builder profiles."),
          f("builders.list.errorTitle", "Couldn't load: title", "Couldn't load builders", { required: true }),
          f("builders.list.retry", "Couldn't load: button", "Retry", { required: true }),
        ],
      },
      {
        id: "detail",
        name: "Builder page",
        fields: [
          f("builders.detail.loading", "While loading", "Loading builder details...", { required: true }),
          f("builders.detail.notFound", "Builder not found", "Builder not found.", { required: true }),
          f("builders.detail.experience", "Experience", "{years} years experience"),
          f("builders.detail.rating", "Rating", "{rating}/5 rating"),
          f("builders.detail.projectsTitle", "Projects heading", "Projects by Property Type"),
          f("builders.detail.noProjects", "No projects", "No properties listed for this builder.", { required: true }),
        ],
      },
    ],
  },
  {
    id: "news",
    name: "News page",
    path: "/news",
    blocks: [
      {
        id: "banner",
        name: "Banner",
        fields: [
          f("news.banner.badge", "Small label above the heading", "Latest Updates"),
          f("news.banner.title", "Heading", "Real Estate News", { required: true }),
          f("news.banner.subtitle", "Text under the heading", "Fresh launches, market trends, policy shifts, and curated insights from our editorial desk.", { multiline: true }),
        ],
      },
      {
        id: "articles",
        name: "Articles",
        fields: [
          f("news.articles.readMore", "Button: read more", "Read More", { required: true }),
          f("news.articles.showLess", "Button: show less", "Show Less", { required: true }),
          f("news.articles.source", "Link: source", "Source", { required: true }),
          f("news.articles.originalSource", "Link: original source (first article)", "Original Source", { required: true }),
          f("news.articles.emptyTitle", "No news: title", "No news published yet", { required: true }),
          f("news.articles.emptyText", "No news: text", "Please check back soon for the latest real-estate updates."),
          f("news.articles.errorTitle", "Couldn't load: title", "Couldn't load news", { required: true }),
          f("news.articles.retry", "Couldn't load: button", "Retry", { required: true }),
        ],
      },
    ],
  },
  {
    id: "about",
    name: "About page",
    path: "/about",
    blocks: [
      {
        id: "banner",
        name: "Banner",
        fields: [
          f("about.banner.badge", "Small label above the heading", "Company Overview"),
          f("about.banner.title", "Heading", "About", { required: true }),
          f("about.banner.subtitle", "Text under the heading", "Know more about our company and leadership."),
        ],
      },
      {
        id: "company",
        name: "Company details",
        fields: [
          f("about.company.rera", "RERA label", "RERA No:", { required: true }),
          f("about.company.phone", "Phone label", "Phone:", { required: true }),
          f("about.company.whatsapp", "WhatsApp label", "WhatsApp:", { required: true }),
          f("about.company.email", "Email label", "Email:", { required: true }),
          f("about.company.website", "Website label", "Website:", { required: true }),
          f("about.company.address", "Address label", "Address:", { required: true }),
          f("about.company.loading", "While loading", "Loading company details...", { required: true }),
          f("about.company.empty", "Nothing to show yet", "About content is not available yet.", { required: true }),
        ],
      },
      {
        id: "team",
        name: "Executives",
        fields: [f("about.team.title", "Heading", "Our Executives")],
      },
    ],
  },
  {
    id: "saved",
    name: "Saved projects page",
    path: "/saved",
    blocks: [
      {
        id: "main",
        name: "Page",
        fields: [
          f("saved.title", "Heading", "Saved Projects", { required: true }),
          f("saved.subtitleGuest", "Text (not signed in)", "Projects you saved on this device."),
          f("saved.subtitleBuyer", "Text (signed in)", "Projects saved to your account, on every device you sign in on."),
          f("saved.subtitleHint", "Hint after the text", "Tap the heart on a project page to add or remove one."),
          f("saved.signInTitle", "Sign-in box: title", "Keep your list on your phone and laptop"),
          f("saved.signInText", "Sign-in box: text", "Sign in with your mobile number. No password, just a code by SMS."),
          f("saved.signInButton", "Sign-in box: button", "Sign in", { required: true }),
          f("saved.loading", "While loading", "Loading saved projects...", { required: true }),
          f("saved.emptyTitle", "No saved projects: title", "No saved projects yet", { required: true }),
          f("saved.emptyText", "No saved projects: text", "Save projects you like to compare them later."),
          f("saved.emptyButton", "No saved projects: button", "Browse projects", { required: true }),
        ],
      },
    ],
  },
  {
    id: "compare",
    name: "Compare page",
    path: "/compare",
    blocks: [
      {
        id: "main",
        name: "Page",
        fields: [
          f("compare.title", "Heading", "Compare projects", { required: true }),
          f("compare.subtitle", "Text under the heading", "Pick up to 3 projects with \"Add to comparison\" on any project page."),
          f("compare.loading", "While loading", "Loading…", { required: true }),
          f("compare.emptyTitle", "Nothing to compare: title", "Nothing to compare yet", { required: true }),
          f("compare.emptyText", "Nothing to compare: text", "Open a project and tap \"Add to comparison\"."),
          f("compare.emptyButton", "Nothing to compare: button", "Browse projects", { required: true }),
          f("compare.viewProject", "Button under each project", "View project", { required: true }),
        ],
      },
      {
        id: "rows",
        name: "Table rows",
        fields: [
          f("compare.row.project", "Project", "Project", { required: true }),
          f("compare.row.price", "Price", "Price", { required: true }),
          f("compare.row.location", "Location", "Location", { required: true }),
          f("compare.row.builder", "Builder", "Builder", { required: true }),
          f("compare.row.type", "Type", "Type", { required: true }),
          f("compare.row.status", "Status", "Status", { required: true }),
          f("compare.row.possession", "Possession", "Possession", { required: true }),
          f("compare.row.unitSizes", "Unit sizes", "Unit sizes", { required: true }),
          f("compare.row.configurations", "Configurations", "Configurations", { required: true }),
          f("compare.row.developmentSize", "Development size", "Development size", { required: true }),
          f("compare.row.totalUnits", "Total units", "Total units", { required: true }),
          f("compare.row.towers", "Towers / blocks", "Towers / blocks", { required: true }),
          f("compare.row.floorPlans", "Floor plans", "Floor plans", { required: true }),
          f("compare.row.amenities", "Amenities", "Amenities", { required: true }),
          f("compare.row.rera", "RERA", "RERA", { required: true }),
          f("compare.row.brochure", "Brochure", "Brochure", { required: true }),
          f("compare.row.brochureYes", "Brochure: available", "Available", { required: true }),
          f("compare.row.brochureNo", "Brochure: not available", "Not yet", { required: true }),
          f("compare.row.media", "Video / virtual tour", "Video / virtual tour", { required: true }),
          f("compare.row.video", "Video", "Video", { required: true }),
          f("compare.row.tour", "Virtual tour", "Virtual tour", { required: true }),
        ],
      },
    ],
  },
  {
    id: "other",
    name: "Other pages",
    blocks: [
      {
        id: "unsubscribe",
        name: "Newsletter unsubscribe page",
        where: "Opened from the link in newsletters",
        fields: [
          f("other.unsub.title", "Heading", "Unsubscribe from our newsletter?", { required: true }),
          f("other.unsub.text", "Text", "You'll stop getting updates about new projects and offers."),
          f("other.unsub.button", "Button", "Yes, unsubscribe me", { required: true }),
          f("other.unsub.working", "Button while working", "Unsubscribing…", { required: true }),
          f("other.unsub.doneTitle", "Done: heading", "You're unsubscribed", { required: true }),
          f("other.unsub.doneText", "Done: text", "You won't get any more newsletters from us."),
          f("other.unsub.invalidTitle", "Bad link: heading", "This link doesn't work", { required: true }),
          f("other.unsub.invalidText", "Bad link: text", "It may be from a test email, or you may already be unsubscribed. If you're still getting emails, reply to one and we'll remove you.", { multiline: true }),
          f("other.unsub.error", "Error", "Something went wrong. Please try again.", { required: true }),
          f("other.unsub.home", "Link home", "Back to the home page", { required: true }),
        ],
      },
      {
        id: "notFound",
        name: "Page not found (404)",
        fields: [
          f("other.notFound.title", "Heading", "404", { required: true }),
          f("other.notFound.text", "Text", "Oops! Page not found", { required: true }),
          f("other.notFound.link", "Link home", "Return to Home", { required: true }),
        ],
      },
    ],
  },
];

export const TEXT_FIELDS: Map<string, TextField> = new Map(
  TEXT_GROUPS.flatMap((g) => g.blocks.flatMap((b) => b.fields.map((fl) => [fl.key, fl] as const))),
);
