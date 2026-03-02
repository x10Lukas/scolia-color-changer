# Scolia Color Changer

Eine Browser-Erweiterung (Manifest V3) für Chrome, die die grüne Akzentfarbe auf [scoliadarts.com](https://scoliadarts.com) durch eine beliebige Farbe ersetzt.

## Features

- **12 Farbvoreinstellungen** – von Blau über Lila bis Pink, inklusive dem Original-Grün
- **Freier Farbwähler** – jede RGB-Farbe per Color-Picker oder Hex-Eingabe wählbar
- **Alpha-erhaltende Ersetzung** – `rgba()`-Transparenzwerte bleiben erhalten; nur der Farbton wird getauscht
- **HSL-Remap-Algorithmus** – alle verschiedenen Grüntöne der Seite werden proportional auf die Zielfarbe gemappt
- **Live-Anwendung** – Änderungen werden sofort per `postMessage` auf dem aktiven Tab übernommen
- **Persistenz** – die gewählte Farbe wird per `chrome.storage.sync` gespeichert und bei jedem Besuch automatisch geladen

## Unterstützte Seiten

| URL-Muster | Beschreibung |
|---|---|
| `*://game.scoliadarts.com/*` | Spiel-Interface |
| `*://scoliadarts.com/*` | Haupt-Website |

## Technischer Ansatz

Der Content-Script (`content.js`) ersetzt grüne Farben direkt im **CSS-Text**, statt einzelne DOM-Elemente zu färben. Das deckt drei Quellen ab:

1. `<style>`-Tags im DOM
2. Inline-`style`-Attribute
3. SVG-Attribute (`fill`, `stroke`, `stop-color`)

Ein `MutationObserver` sowie ein `insertRule`-Hook stellen sicher, dass auch dynamisch hinzugefügtes CSS direkt umgefärbt wird.

Eine Farbe gilt als „Grün", wenn ihr HSL-Farbton zwischen 75° und 175° liegt (mit Mindest-Sättigung und -Helligkeit).

## Installation (Entwickler-Modus)

1. Repository klonen oder als ZIP herunterladen und entpacken
2. In Chrome `chrome://extensions` öffnen
3. **Entwicklermodus** (oben rechts) aktivieren
4. **Entpackte Erweiterung laden** → Ordner auswählen
5. Die Erweiterung erscheint in der Toolbar

## Dateiübersicht

| Datei | Inhalt |
|---|---|
| `manifest.json` | Erweiterungs-Konfiguration (MV3) |
| `popup.html` | UI der Erweiterung |
| `popup.js` | Logik für Voreinstellungen, Farbwähler und Anwenden |
| `content.js` | CSS-Patching auf der Zielseite |

## Farbvoreinstellungen

| Farbe | Hex |
|---|---|
| Original Grün | `#5AAB30` |
| Blau | `#2196F3` |
| Lila | `#9C27B0` |
| Orange-Rot | `#FF5722` |
| Orange | `#FF9800` |
| Rot | `#F44336` |
| Cyan | `#00BCD4` |
| Pink | `#E91E63` |
| Gelb | `#FFEB3B` |
| Amber | `#FF6F00` |
| Blaugrau | `#607D8B` |
| Weiß | `#FFFFFF` |

## Berechtigungen

| Berechtigung | Zweck |
|---|---|
| `storage` | Gewählte Farbe speichern |
| `activeTab` | Aktiven Tab lesen (URL-Prüfung) |
| `scripting` | `postMessage` an Content-Script senden |

## Version

Aktuelle Version: **5.0**
