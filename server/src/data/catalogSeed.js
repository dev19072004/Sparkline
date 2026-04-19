export const catalogSeed = [
  {
    name: "Machinery",
    slug: "machinery",
    shortDescription: "Construction machinery engineered for speed, safety, and dependable site performance.",
    fullDescription:
      "Our machinery range is built for demanding construction environments where productivity, uptime, and operational safety matter most. Each equipment family is selected to support contractors, infrastructure teams, and developers with dependable performance on active sites.",
    image: "/images/product1.jpg",
    sortOrder: 1,
    children: [
      {
        name: "Bar Cutting Machine (SCM)",
        slug: "bar-cutting-machine-scm",
        shortDescription: "Heavy-duty rebar cutting solutions for high-throughput fabrication yards and project sites.",
        fullDescription:
          "The SCM series is designed for accurate and efficient cutting of reinforcement bars across a wide range of project demands. These machines deliver clean cuts, durable operation, and production-ready output for fabrication and site-based work.",
        image: "/images/product1.jpg",
        sortOrder: 1,
        products: [
          {
            name: "SCM 42",
            slug: "scm-42",
            shortDescription: "Compact bar cutting machine suited for standard reinforcement processing.",
            fullDescription:
              "SCM 42 is a dependable bar cutting machine ideal for routine reinforcement work on residential and mid-sized commercial projects. It balances cutting power, operational simplicity, and long service life for contractors who need reliable site performance.",
            image: "/images/product1.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Stable cutting performance for regular fabrication cycles",
              "Operator-friendly controls for day-to-day site usage",
              "Robust body designed for continuous construction workloads",
              "Suitable for fabrication yards and project-site deployment"
            ],
            applications: [
              "Residential towers",
              "Commercial buildings",
              "Housing societies",
              "General reinforcement fabrication"
            ],
            specifications: [
              { label: "Cutting Capacity", value: "Up to 42 mm rebar" },
              { label: "Use Case", value: "General reinforcement cutting" },
              { label: "Machine Type", value: "Mechanical / site-duty" },
              { label: "Duty Profile", value: "Continuous project usage" }
            ]
          },
          {
            name: "SCM 52",
            slug: "scm-52",
            shortDescription: "Higher-capacity rebar cutting solution for larger project demands.",
            fullDescription:
              "SCM 52 is built for teams that need greater cutting capacity and consistent output for busy project schedules. It supports stronger production flow while maintaining accuracy and durability across repeated operation.",
            image: "/images/product1.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Enhanced cutting capacity for demanding applications",
              "Reliable throughput for active fabrication teams",
              "Designed for durability in harsh construction environments",
              "Strong mechanical structure with dependable output quality"
            ],
            applications: [
              "Commercial complexes",
              "Infrastructure packages",
              "Rebar yards",
              "High-volume steel processing"
            ],
            specifications: [
              { label: "Cutting Capacity", value: "Up to 52 mm rebar" },
              { label: "Output Suitability", value: "Medium to high volume" },
              { label: "Frame", value: "Heavy-duty steel construction" },
              { label: "Deployment", value: "Workshop and site-ready" }
            ]
          },
          {
            name: "SCM 55",
            slug: "scm-55",
            shortDescription: "Heavy-duty cutting machine for aggressive reinforcement workloads.",
            fullDescription:
              "SCM 55 is suited for contractors who need maximum cutting confidence on high-volume sites. The machine is engineered to support heavy reinforcement sections, repetitive operation, and efficient steel preparation workflows.",
            image: "/images/product1.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Built for large-bar cutting requirements",
              "Strong structure for intensive daily usage",
              "Supports faster steel preparation on major sites",
              "Reliable performance for time-sensitive work packages"
            ],
            applications: [
              "Metro and infrastructure works",
              "Large commercial developments",
              "Industrial structures",
              "High-load reinforcement fabrication"
            ],
            specifications: [
              { label: "Cutting Capacity", value: "Up to 55 mm rebar" },
              { label: "Project Scale", value: "Large-scale construction" },
              { label: "Duty Profile", value: "Heavy continuous duty" },
              { label: "Positioning", value: "Industrial-grade cutting unit" }
            ]
          }
        ]
      },
      {
        name: "Bar Bending Machine (SBM)",
        slug: "bar-bending-machine-sbm",
        shortDescription: "Precision reinforcement bending machines for productivity-focused fabrication.",
        fullDescription:
          "The SBM series supports accurate bending of reinforcement bars for projects where consistency and repeatability are essential. It is suitable for contractors who require efficient steel processing with dependable bend quality.",
        image: "/images/product2.jpg",
        sortOrder: 2,
        products: [
          {
            name: "SBM 42",
            slug: "sbm-42",
            shortDescription: "Reliable rebar bending equipment for standard project demands.",
            fullDescription:
              "SBM 42 is designed for routine bending operations across residential and commercial projects. It offers stable performance, simple operation, and dependable accuracy for steel fabrication teams.",
            image: "/images/product2.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Consistent bending quality for daily fabrication needs",
              "Simple operator workflow",
              "Strong mechanical design for site conditions",
              "Ideal for controlled reinforcement shaping"
            ],
            applications: [
              "Residential projects",
              "Commercial structures",
              "Rebar workshops",
              "Foundation and slab work"
            ],
            specifications: [
              { label: "Bending Capacity", value: "Up to 42 mm rebar" },
              { label: "Use Case", value: "Routine reinforcement shaping" },
              { label: "Operation", value: "Production-ready workflow" },
              { label: "Fitment", value: "Workshop and site use" }
            ]
          },
          {
            name: "SBM 52",
            slug: "sbm-52",
            shortDescription: "High-capacity bar bending machine for stronger throughput.",
            fullDescription:
              "SBM 52 offers greater bending capability for contractors working on larger or faster-paced job sites. It supports improved production flow while preserving dependable bend quality.",
            image: "/images/product2.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Higher bending capacity for demanding workloads",
              "Reliable shaping performance across repeated cycles",
              "Designed for better productivity on active projects",
              "Durable structure for long-term use"
            ],
            applications: [
              "Commercial complexes",
              "Civil structures",
              "Infrastructure fabrication",
              "Steel processing workshops"
            ],
            specifications: [
              { label: "Bending Capacity", value: "Up to 52 mm rebar" },
              { label: "Output Profile", value: "Medium to high volume" },
              { label: "Frame Type", value: "Heavy-duty body" },
              { label: "Best For", value: "Demanding fabrication cycles" }
            ]
          },
          {
            name: "SBM 55",
            slug: "sbm-55",
            shortDescription: "Heavy-duty bending solution for large-bar and high-demand projects.",
            fullDescription:
              "SBM 55 is built for large-scale project environments where teams need dependable rebar bending on tough schedules. It is suited for contractors who need strength, repeatability, and site-ready durability.",
            image: "/images/product2.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Heavy-duty bending capability",
              "Strong construction for rigorous workloads",
              "Suitable for major project timelines",
              "Delivers consistent output under pressure"
            ],
            applications: [
              "Infrastructure projects",
              "Industrial facilities",
              "High-rise construction",
              "Major fabrication yards"
            ],
            specifications: [
              { label: "Bending Capacity", value: "Up to 55 mm rebar" },
              { label: "Duty Profile", value: "Heavy continuous operation" },
              { label: "Project Suitability", value: "Large-scale construction" },
              { label: "Machine Class", value: "Industrial-grade bending unit" }
            ]
          }
        ]
      },
      {
        name: "Series of Rope Suspended Platform (SRP)",
        slug: "series-of-rope-suspended-platform-srp",
        shortDescription: "Reliable suspended access systems for facade work, maintenance, and exterior operations.",
        fullDescription:
          "The SRP series provides safe and efficient working platforms for high-rise exterior access. These systems are designed for facade treatment, glazing, painting, repair, and maintenance applications that demand stability and operator safety.",
        image: "/images/product3.jpg",
        sortOrder: 3,
        products: [
          {
            name: "SRP 80 P",
            slug: "srp-80-p",
            shortDescription: "Suspended platform solution for controlled facade access applications.",
            fullDescription:
              "SRP 80 P is built for exterior access jobs where teams need dependable suspension performance and safe working platforms. It supports routine facade maintenance, installation, and project finishing operations.",
            image: "/images/product3.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Stable suspended access for facade work",
              "Supports safer elevated operations",
              "Suitable for maintenance and installation tasks",
              "Designed for practical site deployment"
            ],
            applications: [
              "Facade maintenance",
              "Painting and coating",
              "Glass installation",
              "Repair and cleaning jobs"
            ],
            specifications: [
              { label: "Platform Type", value: "Rope suspended platform" },
              { label: "Typical Use", value: "Exterior access works" },
              { label: "Safety Focus", value: "Stable elevated operations" },
              { label: "Project Fit", value: "Commercial and residential facades" }
            ]
          },
          {
            name: "SRP 100",
            slug: "srp-100",
            shortDescription: "Heavy-duty suspended platform system for broader access requirements.",
            fullDescription:
              "SRP 100 supports more demanding facade access applications with strong operational stability and dependable working support. It is well suited to contractors handling larger or more complex external access tasks.",
            image: "/images/product3.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Enhanced support for demanding facade operations",
              "Reliable suspended access for active sites",
              "Efficient for repair, installation, and maintenance jobs",
              "Designed with operational consistency in mind"
            ],
            applications: [
              "High-rise maintenance",
              "Facade installation",
              "Large building access support",
              "Industrial exterior works"
            ],
            specifications: [
              { label: "Platform Type", value: "Rope suspended platform" },
              { label: "Capacity Class", value: "High-demand access solution" },
              { label: "Best For", value: "Extended facade operations" },
              { label: "Site Use", value: "Commercial and infrastructure projects" }
            ]
          }
        ]
      },
      {
        name: "Series of Passenger & Material Hoist (SPM)",
        slug: "series-of-passenger-material-hoist-spm",
        shortDescription: "Vertical transportation systems for efficient movement of personnel and materials.",
        fullDescription:
          "The SPM series is developed to improve vertical logistics on construction sites by enabling dependable transport of workforce and materials. These hoists are designed to enhance safety, reduce manual dependency, and keep project movement efficient.",
        image: "/images/product4.jpg",
        sortOrder: 4,
        products: [
          {
            name: "SPM 200",
            slug: "spm-200",
            shortDescription: "High-capacity passenger and material hoist for demanding sites.",
            fullDescription:
              "SPM 200 is a dependable hoist system for large projects where vertical movement must remain efficient and safe. It supports faster material handling and improved site coordination for teams operating across multiple levels.",
            image: "/images/product4.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Efficient vertical transport of manpower and material",
              "Designed for active multi-level construction environments",
              "Supports safe and organized site movement",
              "Suitable for projects with heavy daily usage"
            ],
            applications: [
              "High-rise construction",
              "Commercial towers",
              "Large residential developments",
              "Infrastructure structures"
            ],
            specifications: [
              { label: "Hoist Type", value: "Passenger & material hoist" },
              { label: "Capacity Class", value: "High-capacity operations" },
              { label: "Best For", value: "Large multi-storey sites" },
              { label: "Operational Focus", value: "Safety and throughput" }
            ]
          },
          {
            name: "SPM 150",
            slug: "spm-150",
            shortDescription: "Balanced hoist solution for mid-to-large scale project logistics.",
            fullDescription:
              "SPM 150 is suited for projects that require reliable vertical transportation without compromising safety or site efficiency. It is a strong fit for projects where steady movement of teams and materials is essential.",
            image: "/images/product4.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Dependable site transport performance",
              "Improves construction logistics efficiency",
              "Supports safer movement across levels",
              "Well suited to structured site workflows"
            ],
            applications: [
              "Residential towers",
              "Commercial buildings",
              "Mixed-use projects",
              "Mid-rise and high-rise work"
            ],
            specifications: [
              { label: "Hoist Type", value: "Passenger & material hoist" },
              { label: "Capacity Class", value: "Medium to high capacity" },
              { label: "Ideal Use", value: "Organized site logistics" },
              { label: "Project Scale", value: "Mid to large developments" }
            ]
          },
          {
            name: "SPM 100",
            slug: "spm-100",
            shortDescription: "Compact passenger and material hoist for efficient project movement.",
            fullDescription:
              "SPM 100 offers dependable vertical transport for sites that need practical, efficient movement of people and materials. It provides a reliable logistics solution for growing projects and structured construction schedules.",
            image: "/images/product4.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Practical hoist solution for day-to-day site transport",
              "Supports efficient material movement",
              "Improves workforce access between levels",
              "Designed for dependable operation"
            ],
            applications: [
              "Residential projects",
              "Commercial blocks",
              "Housing society developments",
              "Medium-rise structures"
            ],
            specifications: [
              { label: "Hoist Type", value: "Passenger & material hoist" },
              { label: "Capacity Class", value: "Compact project solution" },
              { label: "Focus", value: "Daily site movement" },
              { label: "Fitment", value: "Residential and commercial developments" }
            ]
          }
        ]
      },
      {
        name: "Multi-functional Passenger & Material Hoist (SMH)",
        slug: "multi-functional-passenger-material-hoist-smh",
        shortDescription: "Flexible hoist systems designed for complex project logistics and access needs.",
        fullDescription:
          "The SMH series combines vertical mobility, dependable lifting support, and flexible site utility for teams that need efficient handling of both manpower and materials. It is especially useful where adaptable site movement is important.",
        image: "/images/product2.jpg",
        sortOrder: 5,
        products: [
          {
            name: "SMH 150",
            slug: "smh-150",
            shortDescription: "Multi-functional hoist for versatile site handling requirements.",
            fullDescription:
              "SMH 150 is designed for construction teams that need a versatile hoist platform capable of supporting personnel and material handling in demanding site conditions. It is a practical choice for organized, high-activity environments.",
            image: "/images/product2.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Multi-functional site movement support",
              "Flexible application across construction phases",
              "Reliable handling of people and materials",
              "Designed for active project environments"
            ],
            applications: [
              "Commercial developments",
              "Industrial buildings",
              "Large site logistics",
              "Complex construction programs"
            ],
            specifications: [
              { label: "System Type", value: "Multi-functional hoist" },
              { label: "Capacity Class", value: "Medium-high site demand" },
              { label: "Strength", value: "Flexible personnel and material movement" },
              { label: "Use Case", value: "Complex multi-stage projects" }
            ]
          },
          {
            name: "SMH 100",
            slug: "smh-100",
            shortDescription: "Versatile hoist platform for efficient day-to-day project mobility.",
            fullDescription:
              "SMH 100 offers dependable multi-purpose vertical movement for projects that require practical handling of workforce and materials. It is suited to contractors seeking operational flexibility with dependable site reliability.",
            image: "/images/product2.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Supports practical multi-purpose site movement",
              "Flexible deployment across project stages",
              "Improves efficiency in day-to-day operations",
              "Reliable performance in structured workflows"
            ],
            applications: [
              "Residential developments",
              "Mid-rise commercial sites",
              "Logistics support tasks",
              "General construction operations"
            ],
            specifications: [
              { label: "System Type", value: "Multi-functional hoist" },
              { label: "Capacity Class", value: "Compact versatile solution" },
              { label: "Best For", value: "Operational flexibility" },
              { label: "Project Fit", value: "General construction sites" }
            ]
          }
        ]
      },
      {
        name: "Scrap Straightening Machine",
        slug: "scrap-straightening-machine",
        shortDescription: "Reliable straightening systems for reusing and preparing steel material efficiently.",
        fullDescription:
          "Our straightening machines help contractors and yards recover, process, and prepare steel material with better control and efficiency. They are designed for dependable output, reduced waste, and smoother downstream fabrication.",
        image: "/images/product3.jpg",
        sortOrder: 6,
        products: [
          {
            name: "GX6-25 with cutter",
            slug: "gx6-25-with-cutter",
            shortDescription: "Straightening machine with integrated cutting support for streamlined processing.",
            fullDescription:
              "GX6-25 with cutter is built to straighten and prepare steel material efficiently while supporting smoother processing flow through integrated cutting functionality. It helps reduce handling time and supports productive yard operations.",
            image: "/images/product3.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Straightening and cutting support in one workflow",
              "Reduces manual handling steps",
              "Supports productive scrap and steel recovery operations",
              "Built for dependable yard performance"
            ],
            applications: [
              "Steel recovery yards",
              "Fabrication prep",
              "Scrap processing",
              "General construction workshops"
            ],
            specifications: [
              { label: "Machine Type", value: "Straightening machine with cutter" },
              { label: "Process Flow", value: "Straighten and cut" },
              { label: "Best For", value: "Recovered steel preparation" },
              { label: "Environment", value: "Workshops and yards" }
            ]
          },
          {
            name: "GX6-14",
            slug: "gx6-14",
            shortDescription: "Compact straightening machine for efficient scrap and steel preparation.",
            fullDescription:
              "GX6-14 provides dependable straightening performance for teams handling lighter steel recovery and preparation operations. It is suitable for yards and fabrication setups where consistent straightening matters.",
            image: "/images/product3.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Compact and efficient straightening support",
              "Reliable output for steel preparation tasks",
              "Supports better reuse and processing control",
              "Suitable for workshop-based operation"
            ],
            applications: [
              "Light scrap processing",
              "Steel recovery operations",
              "Fabrication preparation",
              "General workshop use"
            ],
            specifications: [
              { label: "Machine Type", value: "Compact straightening machine" },
              { label: "Use Case", value: "Light to medium material preparation" },
              { label: "Focus", value: "Efficient straightening" },
              { label: "Fitment", value: "Workshop and scrap handling setups" }
            ]
          }
        ]
      },
      {
        name: "Ring Making Machine",
        slug: "ring-making-machine",
        shortDescription: "Steel ring fabrication machinery for structured reinforcement workflows.",
        fullDescription:
          "The ring making machine range supports fast and consistent production of reinforcement rings used across construction activities. It helps teams maintain better quality, faster output, and smoother steel processing workflows.",
        image: "/images/product1.jpg",
        sortOrder: 7,
        products: [
          {
            name: "GF20D",
            slug: "gf20d",
            shortDescription: "Efficient ring making machine for routine reinforcement production.",
            fullDescription:
              "GF20D is designed for dependable ring fabrication across standard construction needs. It supports production speed, repeatability, and controlled shaping for reinforcement ring workflows.",
            image: "/images/product1.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Consistent ring formation for reinforcement work",
              "Reliable daily production support",
              "Practical workflow for fabrication teams",
              "Suitable for regular site and yard demand"
            ],
            applications: [
              "Column reinforcement rings",
              "Fabrication yards",
              "General construction steel prep",
              "Standard reinforcement jobs"
            ],
            specifications: [
              { label: "Machine Type", value: "Ring making machine" },
              { label: "Production Focus", value: "Routine reinforcement rings" },
              { label: "Best For", value: "Standard fabrication work" },
              { label: "Operation", value: "Repeatable ring production" }
            ]
          },
          {
            name: "GF36",
            slug: "gf36",
            shortDescription: "Higher-capacity ring making solution for demanding steel fabrication.",
            fullDescription:
              "GF36 supports larger or more demanding ring production workloads where productivity and consistency are essential. It is suited to teams handling higher reinforcement output requirements.",
            image: "/images/product1.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Supports stronger production output",
              "Consistent shaping across repeated operations",
              "Built for demanding fabrication tasks",
              "Improves workflow efficiency in reinforcement prep"
            ],
            applications: [
              "High-volume rebar yards",
              "Large construction packages",
              "Industrial fabrication work",
              "Reinforcement ring production"
            ],
            specifications: [
              { label: "Machine Type", value: "Ring making machine" },
              { label: "Capacity Class", value: "Higher-output fabrication" },
              { label: "Use Case", value: "Demanding ring production" },
              { label: "Strength", value: "Consistent repetitive output" }
            ]
          }
        ]
      },
      {
        name: "Self Loading Concrete Batching Vehicle",
        slug: "self-loading-concrete-batching-vehicle",
        shortDescription: "Mobile batching solutions for efficient mixing and delivery in one compact machine.",
        fullDescription:
          "The self loading concrete batching vehicle range is designed to improve concrete production efficiency by combining loading, batching, mixing, and transport functions in one unit. It helps teams reduce turnaround time and improve flexibility on remote or active sites.",
        image: "/images/product4.jpg",
        sortOrder: 8,
        products: [
          {
            name: "JOHN 2.3 CM",
            slug: "john-2-3-cm",
            shortDescription: "Compact self-loading concrete batching vehicle for agile site operations.",
            fullDescription:
              "JOHN 2.3 CM is a practical solution for projects that need mobile concrete production with fast turnaround and site flexibility. It is well suited to scattered job locations and projects where operational independence matters.",
            image: "/images/product4.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Combines loading, batching, mixing, and movement",
              "Improves concrete supply flexibility on site",
              "Suitable for remote and distributed work areas",
              "Supports faster daily concrete operations"
            ],
            applications: [
              "Housing societies",
              "Roadside structures",
              "Remote project sites",
              "General concrete production"
            ],
            specifications: [
              { label: "Vehicle Type", value: "Self loading concrete batching vehicle" },
              { label: "Batching Class", value: "Compact mobile solution" },
              { label: "Best For", value: "Agile site concrete supply" },
              { label: "Operational Benefit", value: "Mobility and independence" }
            ]
          },
          {
            name: "JOHN 4.5 CM",
            slug: "john-4-5-cm",
            shortDescription: "Higher-capacity mobile batching vehicle for larger concrete demand.",
            fullDescription:
              "JOHN 4.5 CM supports larger concrete requirements with the flexibility of a self-loading system. It is a dependable option for teams that need productivity, movement, and controlled batching performance in one machine.",
            image: "/images/product4.jpg",
            brochureFileName: "SPARKLINE-8.pdf",
            features: [
              "Supports higher concrete production needs",
              "Improves batching efficiency on active sites",
              "Combines multiple concrete operations in one system",
              "Designed for stronger site productivity"
            ],
            applications: [
              "Commercial projects",
              "Infrastructure support works",
              "Larger housing developments",
              "High-demand concrete operations"
            ],
            specifications: [
              { label: "Vehicle Type", value: "Self loading concrete batching vehicle" },
              { label: "Batching Class", value: "Higher-capacity mobile solution" },
              { label: "Use Case", value: "Larger concrete demand" },
              { label: "Strength", value: "Integrated mobile batching workflow" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Spareparts",
    slug: "spareparts",
    shortDescription: "Dependable spare parts support to keep construction machinery performing consistently.",
    fullDescription:
      "Our spare parts division supports machinery uptime with dependable replacement parts, maintenance support items, and compatible components for construction equipment. We focus on timely supply, fitment confidence, and long-term support for active projects and equipment fleets.",
    image: "/images/product2.jpg",
    sortOrder: 2,
    children: []
  }
];
