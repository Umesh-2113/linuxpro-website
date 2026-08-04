export const navLinks = [
  { href: "/#plans", label: "Plans" },
  { href: "/#series", label: "Series" },
  { href: "/#why", label: "Features" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export const plans = [
  {
    name: "Starter VPS",
    desc: "Perfect for small projects",
    price: 299,
    popular: false,
    features: ["2 vCPU", "4GB RAM", "50GB NVMe SSD", "1TB Bandwidth"],
  },
  {
    name: "Business VPS",
    desc: "Ideal for growing businesses",
    price: 599,
    popular: true,
    features: ["4 vCPU", "8GB RAM", "100GB NVMe SSD", "2TB Bandwidth"],
  },
  {
    name: "Pro VPS",
    desc: "For demanding applications",
    price: 999,
    popular: false,
    features: ["8 vCPU", "16GB RAM", "200GB NVMe SSD", "5TB Bandwidth"],
  },
  {
    name: "Enterprise VPS",
    desc: "Maximum power & performance",
    price: 1999,
    popular: false,
    features: ["16 vCPU", "32GB RAM", "500GB NVMe SSD", "10TB Bandwidth"],
  },
];

export const features = [
  {
    title: "99.99% Uptime Guarantee",
    desc: "Industry-leading SLA backed by redundant infrastructure and proactive monitoring.",
    icon: "uptime",
  },
  {
    title: "NVMe SSD Storage",
    desc: "Lightning-fast NVMe drives deliver up to 10x faster I/O than traditional SSDs.",
    icon: "storage",
  },
  {
    title: "DDoS Protection",
    desc: "Multi-layer DDoS mitigation keeps your servers online during attacks.",
    icon: "shield",
  },
  {
    title: "Instant VPS Deployment",
    desc: "Deploy your server in under 60 seconds with our automated provisioning.",
    icon: "bolt",
  },
  {
    title: "Full Root Access",
    desc: "Complete control over your server with unrestricted root SSH access.",
    icon: "lock",
  },
  {
    title: "24/7 Technical Support",
    desc: "Expert Linux engineers available around the clock via chat, email, and phone.",
    icon: "chat",
  },
  {
    title: "Global Data Centers",
    desc: "Deploy in Mumbai, Singapore, Frankfurt, and US East for low latency worldwide.",
    icon: "globe",
  },
  {
    title: "Free SSL Certificates",
    desc: "Auto-provisioned Let's Encrypt SSL certificates for all your domains.",
    icon: "ssl",
  },
];

export const whyUsItems = [
  {
    title: "High-Speed Infrastructure",
    desc: "Latest-gen AMD EPYC processors and 10Gbps network backbone.",
    icon: "bolt",
  },
  {
    title: "Enterprise Security",
    desc: "Hardware firewalls, encrypted backups, and SOC 2 compliant data centers.",
    icon: "shield",
  },
  {
    title: "Affordable Pricing",
    desc: "Premium hosting without the premium price tag. No hidden fees.",
    icon: "dollar",
  },
  {
    title: "One-Click OS Installation",
    desc: "Ubuntu, Debian, CentOS, Rocky Linux, and more with a single click.",
    icon: "monitor",
  },
  {
    title: "Easy Control Panel",
    desc: "Intuitive dashboard to manage servers, DNS, backups, and billing.",
    icon: "grid",
  },
  {
    title: "Scalable Resources",
    desc: "Upgrade CPU, RAM, and storage on the fly without downtime.",
    icon: "chart",
  },
];

export const stats = [
  { value: 10000, suffix: "+", label: "Active Customers", decimals: 0 },
  { value: 50000, suffix: "+", label: "Servers Deployed", decimals: 0 },
  { value: 99.99, suffix: "%", label: "Uptime", decimals: 2 },
  { value: null, display: "24", suffix: "/7", label: "Support", decimals: 0 },
];

export const compareRows = [
  { feature: "vCPU Cores", values: ["2", "4", "8", "16"] },
  { feature: "RAM", values: ["4 GB", "8 GB", "16 GB", "32 GB"] },
  { feature: "NVMe SSD", values: ["50 GB", "100 GB", "200 GB", "500 GB"] },
  { feature: "Bandwidth", values: ["1 TB", "2 TB", "5 TB", "10 TB"] },
  { feature: "DDoS Protection", values: [true, true, true, true] },
  { feature: "Free SSL", values: [true, true, true, true] },
  { feature: "Root Access", values: [true, true, true, true] },
  { feature: "Priority Support", values: [false, true, true, true] },
  { feature: "Monthly Price", values: ["₹299", "₹599", "₹999", "₹1999"] },
];

export const testimonials = [
  {
    text: "Switched to LinuxPro six months ago and our app response times dropped by 40%. The NVMe storage is incredibly fast and support resolved our migration in under an hour.",
    name: "Rajesh Kumar",
    role: "CTO, TechFlow Solutions",
    initials: "RK",
    gradient: "linear-gradient(135deg, #00D084, #00a86b)",
  },
  {
    text: "Best value VPS hosting in India. We run 12 production servers on LinuxPro and the uptime has been flawless. The control panel makes management a breeze.",
    name: "Priya Sharma",
    role: "Founder, CloudNest Agency",
    initials: "PS",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    text: "Enterprise features at startup prices. Their DDoS protection saved us during a major attack last quarter. I recommend LinuxPro to every developer I know.",
    name: "Arjun Mehta",
    role: "Lead DevOps, ScaleUp Labs",
    initials: "AM",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
  },
];

export const faqItems = [
  {
    question: "What is VPS hosting and how is it different from shared hosting?",
    answer:
      "VPS (Virtual Private Server) hosting gives you dedicated resources on a virtual machine. Unlike shared hosting where resources are split among many users, a VPS provides guaranteed CPU, RAM, and storage with full root access for complete control.",
  },
  {
    question: "How quickly can I deploy a new server?",
    answer:
      "Most VPS instances are deployed within 60 seconds after payment confirmation. You'll receive login credentials via email and can access your server immediately via SSH or our web console.",
  },
  {
    question: "Can I upgrade my plan later?",
    answer:
      "Yes! You can upgrade CPU, RAM, and storage at any time from your control panel. Upgrades are applied with minimal downtime — typically under 5 minutes with a quick reboot.",
  },
  {
    question: "Which operating systems do you support?",
    answer:
      "We support Ubuntu, Debian, CentOS, Rocky Linux, AlmaLinux, Fedora, and Windows Server. You can reinstall your OS at any time from the control panel with one click.",
  },
  {
    question: "Do you offer a money-back guarantee?",
    answer:
      "Yes, we offer a 7-day money-back guarantee on all VPS plans. If you're not satisfied, contact support within 7 days for a full refund — no questions asked.",
  },
  {
    question: "Where are your data centers located?",
    answer:
      "We operate data centers in Mumbai (India), Singapore, Frankfurt (Germany), and New York (US). You can choose your preferred location during server setup for optimal latency.",
  },
];

