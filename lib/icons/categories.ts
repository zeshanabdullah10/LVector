// lib/icons/categories.ts

export const CATEGORIES = {
  "General": {
    "Arrows": [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "ChevronUp", "ChevronDown", "ChevronLeft", "ChevronRight",
      "CornerUpLeft", "CornerUpRight", "CornerDownLeft", "CornerDownRight",
      "ChevronsUp", "ChevronsDown", "ChevronsLeft", "ChevronsRight",
      "ArrowUpRight", "ArrowUpLeft", "ArrowDownRight", "ArrowDownLeft",
      "Move", "RefreshCw", "RotateCw", "RotateCcw"
    ],
    "Files": [
      "File", "FileText", "FilePlus", "FileMinus", "FileCheck", "FileX",
      "Folder", "FolderOpen", "FolderPlus", "FolderMinus",
      "Image", "Images", "FileImage", "Upload", "Download",
      "Copy", "Clipboard", "ClipboardCopy", "Archive", "Package"
    ],
    "Users": [
      "User", "Users", "UserPlus", "UserMinus", "UserCheck", "UserX",
      "Shield", "ShieldCheck", "ShieldAlert", "Lock", "Unlock", "Key"
    ]
  },
  "UI": {
    "Buttons": [
      "Square", "SquareCheck", "CheckSquare", "XSquare", "MinusSquare", "PlusSquare",
      "Triangle", "Circle", "Hexagon", "Octagon", "Pentagon", "Cross"
    ],
    "Controls": [
      "Play", "Pause", "SkipBack", "SkipForward", "Rewind", "FastForward",
      "Volume", "Volume1", "Volume2", "VolumeX",
      "Maximize", "Minimize", "ZoomIn", "ZoomOut", "Focus",
      "Sliders", "Gauge"
    ],
    "Navigation": [
      "Home", "Settings", "Search", "Menu", "Grid", "List",
      "MoreHorizontal", "MoreVertical",
      "X", "Check", "CheckCircle", "Plus", "Minus", "CircleDot",
      "Crosshair", "MousePointer", "Pointer"
    ]
  },
  "Devices": {
    "Hardware": [
      "Cpu", "Monitor", "Server", "HardDrive", "Printer", "Tablet",
      "Smartphone", "Laptop", "Wifi", "Plug", "PlugZap",
      "Battery", "BatteryCharging", "BatteryFull", "Radar", "Tv"
    ],
    "Sensors": [
      "Thermometer", "Droplet", "Wind", "Waves", "Flame",
      "Eye", "EyeOff", "Scan", "ScanLine", "Radio",
      "Signal", "Activity"
    ]
  },
  "Science": {
    "Math": [
      "Divide", "Plus", "Minus", "X", "Equal",
      "Percent", "Hash", "Sigma", "Pi",
      "ChevronRight", "ChevronLeft", "Aperture"
    ],
    "Charts": [
      "BarChart", "BarChart2", "BarChart3",
      "LineChart", "PieChart", "AreaChart",
      "TrendingUp", "TrendingDown", "Activity",
      "ScatterChart", "ChartNoAxesCombined"
    ],
    "Lab Equipment": [
      "FlaskConical", "Beaker", "TestTube",
      "Atom", "Dna", "Microscope", "Telescope", "Crosshair"
    ]
  },
  "Social": {
    "Communication": [
      "Mail", "Inbox", "MessageCircle", "MessageSquare",
      "Phone", "PhoneCall", "PhoneIncoming", "PhoneOutgoing",
      "Send", "Bell", "BellRing", "BellOff", "AtSign"
    ],
    "Media": [
      "Video", "VideoOff", "Camera", "CameraOff",
      "Image", "Music", "Headphones", "Speaker", "Mic", "MicOff",
      "Radio", "Tv", "Play"
    ]
  }
} as const

export type Category = keyof typeof CATEGORIES
export type Subcategory<C extends Category> = keyof typeof CATEGORIES[C]

export function getAllIconNames(): string[] {
  const names: string[] = []
  for (const subcats of Object.values(CATEGORIES)) {
    for (const icons of Object.values(subcats)) {
      names.push(...icons)
    }
  }
  return [...new Set(names)].sort()
}

export function getIconByName(name: string): string | undefined {
  const all = getAllIconNames()
  return all.includes(name) ? name : undefined
}