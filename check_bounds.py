
import xml.etree.ElementTree as ET
import re

def get_path_bbox(d):
    # Very crude path parser just to get points
    # Extract all numbers
    floats = [float(x) for x in re.findall(r"[-+]?\d*\.\d+|[-+]?\d+", d)]
    # Coordinates come in pairs usually, but we just need min/max of all numbers? 
    # No, SVG path commands are like M x y ... 
    # But essentially all X coordinates are at even indices (if relative commands aren't used improperly or handled poorly)
    # The file uses absolute coordinates (M, C, Z) mostly.
    # To be safe and simple, let's just grab all numbers and check logic, 
    # BUT actually path commands might have single params. 
    # However, looking at the file: M x,y C x,y x,y x,y ... 
    # It seems to be entirely coordinate pairs.
    
    # Let's try to robustly parse just x and y
    # Since we just want the EXTENT, extracting all numbers and separating evens (x) and odds (y) 
    # is a decent approximation if there are no single-parameter commands like H or V.
    # The file seems to use M and C primarily.
    
    xs = []
    ys = []
    
    # Cleaning the string first
    d_clean = d.replace(',', ' ').replace('M', ' ').replace('C', ' ').replace('Z', ' ').replace('L', ' ')
    nums = [float(x) for x in d_clean.split()]
    
    if len(nums) % 2 != 0:
        # Unexpected path format, maybe H/V used?
        return None
        
    for i in range(0, len(nums), 2):
        xs.append(nums[i])
        ys.append(nums[i+1])
        
    if not xs:
        return None
        
    return min(xs), max(xs), min(ys), max(ys)

def analyze_svg(input_path):
    tree = ET.parse(input_path)
    root = tree.getroot()
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    
    min_x, max_x = 10000, -10000
    min_y, max_y = 10000, -10000
    
    paths_found = 0
    
    # Check all paths, including those in mask if relevant, but really we care about visual content
    # The mask rect is 1024x1024 so we ignore it.
    
    for path in root.findall('.//svg:path', ns):
        d = path.get('d')
        fill = path.get('fill')
        
        # Ignore the white rect in mask if it exists as a path (it was a rect element though)
        if not d: continue
        
        bbox = get_path_bbox(d)
        if bbox:
            px_min, px_max, py_min, py_max = bbox
            if px_min < min_x: min_x = px_min
            if px_max > max_x: max_x = px_max
            if py_min < min_y: min_y = py_min
            if py_max > max_y: max_y = py_max
            paths_found += 1
            
    print(f"Content Bounds: X[{min_x:.1f}, {max_x:.1f}] Y[{min_y:.1f}, {max_y:.1f}]")
    width = max_x - min_x
    height = max_y - min_y
    print(f"Content Size: {width:.1f} x {height:.1f}")
    
    # Current Viewbox is 0 0 1024 1024
    # Calculate margins
    print(f"Margins: Left:{min_x:.1f}, Top:{min_y:.1f}, Right:{1024-max_x:.1f}, Bottom:{1024-max_y:.1f}")

if __name__ == "__main__":
    analyze_svg('assets/favicon_transparent.svg')
