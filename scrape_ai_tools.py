"""
AI Product Trends Scraper
Scrapes trending AI products from theresanaiforthat.com and generates Markdown notes.
"""
import requests
from bs4 import BeautifulSoup
import time
import json
import os
import sys
from urllib.parse import urljoin
from datetime import datetime


# Default images directory (can be overridden)
IMAGES_DIR = "images"


def download_image(url, filename, headers, images_dir=None):
    """Download image to local directory"""
    target_dir = images_dir or IMAGES_DIR
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            filepath = os.path.join(target_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(resp.content)
            return filepath
    except Exception as e:
        print(f"  Image download failed: {e}", file=sys.stderr)
    return None


def scrape_trending_ai_tools(limit=10, images_dir=None):
    """Scrape top N trending AI products with Overview, category and images"""
    
    target_images_dir = images_dir or IMAGES_DIR
    
    # Ensure images directory exists
    if not os.path.exists(target_images_dir):
        os.makedirs(target_images_dir)
        print(f"Created images directory: {target_images_dir}", file=sys.stderr)
    
    base_url = "https://theresanaiforthat.com"
    trending_url = f"{base_url}/trending/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    print(f"Fetching Trending page: {trending_url}", file=sys.stderr)
    response = requests.get(trending_url, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch Trending page, status: {response.status_code}", file=sys.stderr)
        return []
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find product links (format: /ai/product-name/)
    product_links = []
    seen = set()
    
    for link in soup.find_all('a', href=True):
        href = link['href']
        # Match /ai/xxx/ format links
        if href.startswith('/ai/') and href.endswith('/') and href.count('/') == 3:
            if href not in seen:
                seen.add(href)
                product_links.append(href)
    
    print(f"Found {len(product_links)} product links", file=sys.stderr)
    
    # Take only first N
    product_links = product_links[:limit]
    
    # Visit each product page and extract data
    results = []
    for i, link in enumerate(product_links):
        product_url = base_url + link
        product_name = link.replace('/ai/', '').replace('/', '')
        print(f"Scraping ({i+1}/{limit}): {product_name}", file=sys.stderr)
        
        try:
            resp = requests.get(product_url, headers=headers)
            
            if resp.status_code != 200:
                print(f"  Failed, status: {resp.status_code}", file=sys.stderr)
                continue
                
            product_soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Extract product title (display name)
            title_tag = product_soup.find('h1', class_='ai_title')
            display_name = title_tag.get_text(strip=True) if title_tag else product_name.replace('-', ' ').title()
            
            # Extract category/task
            category = "Other"
            task_link = product_soup.find('a', href=lambda x: x and '/task/' in x)
            if task_link:
                category = task_link.get_text(strip=True)
            
            # Extract product image (class="ai_image")
            image_url = None
            image_path = None
            img_tag = product_soup.find('img', class_='ai_image')
            if img_tag and img_tag.get('src'):
                image_url = img_tag['src']
                # Ensure full URL
                if not image_url.startswith('http'):
                    image_url = urljoin(base_url, image_url)
                
                # Determine file extension
                img_ext = '.png'
                if '.jpg' in image_url or '.jpeg' in image_url:
                    img_ext = '.jpg'
                elif '.webp' in image_url:
                    img_ext = '.webp'
                elif '.gif' in image_url:
                    img_ext = '.gif'
                
                img_filename = f"{product_name}{img_ext}"
                image_path = download_image(image_url, img_filename, headers, target_images_dir)
                if image_path:
                    print(f"  Image saved: {image_path}", file=sys.stderr)
            
            # Extract Overview
            overview_div = product_soup.find('div', class_='description ai_description card-primary')
            
            # Fallback: find Overview by h2 title
            if not overview_div:
                h2_tags = product_soup.find_all('h2', class_='card-title')
                for h2 in h2_tags:
                    if 'Overview' in h2.get_text():
                        overview_div = h2.find_parent('div', class_='description')
                        break
            
            if overview_div:
                # Remove social icons
                social_icons = overview_div.find('div', class_='social_icons')
                if social_icons:
                    social_icons.decompose()
                
                # Remove "Show more" button
                show_more = overview_div.find('div', class_='show_more')
                if show_more:
                    show_more.decompose()
                
                # Remove h2 title
                h2_title = overview_div.find('h2')
                if h2_title:
                    h2_title.decompose()
                
                # Extract text content
                overview_text = overview_div.get_text(separator='\n', strip=True)
                
                # Clean up extra newlines
                lines = [line.strip() for line in overview_text.split('\n') if line.strip()]
                overview_text = '\n'.join(lines)
                
                results.append({
                    'rank': i + 1,
                    'name': product_name,
                    'display_name': display_name,
                    'category': category,
                    'url': product_url,
                    'image_url': image_url,
                    'image_local': image_path,
                    'overview': overview_text
                })
                print(f"  Got Overview ({len(overview_text)} chars), Category: {category}", file=sys.stderr)
            else:
                print(f"  Overview not found", file=sys.stderr)
            
            # Polite scraping delay
            time.sleep(1)
            
        except Exception as e:
            print(f"  Scraping failed: {e}", file=sys.stderr)
    
    return results


def generate_markdown_note(results, use_local_images=True):
    """Generate formatted Markdown note from scrape results"""
    today = datetime.now().strftime('%Y/%m/%d')
    
    # Group products by category
    categories = {}
    for item in results:
        cat = item.get('category', 'Other')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)
    
    # Build Markdown content
    lines = []
    lines.append(f"# AI Product Trends - {today}")
    lines.append("")
    lines.append("> Trending AI tools from [theresanaiforthat.com](https://theresanaiforthat.com/trending/)")
    lines.append("")
    
    for category, products in categories.items():
        lines.append(f"## {category}")
        lines.append("")
        
        for product in products:
            lines.append(f"### {product['display_name']}")
            lines.append("")
            
            # Overview (truncate if too long for readability)
            overview = product['overview']
            if len(overview) > 500:
                overview = overview[:500] + "..."
            lines.append(overview)
            lines.append("")
            
            # Image - use filename only for Electron to resolve via getImagePath
            if use_local_images and product.get('image_local'):
                # Use only filename, not full path
                img_filename = os.path.basename(product['image_local'])
                lines.append(f"![{product['display_name']}]({img_filename})")
            elif product.get('image_url'):
                lines.append(f"![{product['display_name']}]({product['image_url']})")
            lines.append("")
            
            # Product link
            lines.append(f"[View Product]({product['url']})")
            lines.append("")
            lines.append("---")
            lines.append("")
    
    return '\n'.join(lines)


def save_results(results, filename='ai_tools_overview.json'):
    """Save results to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nResults saved to: {filename}", file=sys.stderr)


def main(limit=10, images_dir=None, output_json=None):
    """
    Main entry point for external callers.
    
    Args:
        limit: Number of products to scrape (default 10)
        images_dir: Directory to save images (default 'images')
        output_json: If provided, save JSON results to this file
    
    Returns:
        dict with 'markdown' content and 'images' list of paths
    """
    print("=" * 60, file=sys.stderr)
    print(f"Scraping top {limit} trending AI products", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    results = scrape_trending_ai_tools(limit=limit, images_dir=images_dir)
    
    if not results:
        return {'markdown': '', 'images': [], 'error': 'No products found'}
    
    # Save JSON if path provided
    if output_json:
        save_results(results, output_json)
    
    # Generate Markdown
    markdown = generate_markdown_note(results, use_local_images=True)
    
    # Collect image paths
    images = [item['image_local'] for item in results if item.get('image_local')]
    
    print(f"\nSuccessfully scraped {len(results)} products", file=sys.stderr)
    
    return {
        'markdown': markdown,
        'images': images,
        'count': len(results)
    }


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape trending AI products')
    parser.add_argument('--limit', type=int, default=10, help='Number of products to scrape')
    parser.add_argument('--images-dir', type=str, default=None, help='Directory to save images')
    parser.add_argument('--output-json', type=str, default=None, help='Output JSON file path')
    
    args = parser.parse_args()
    
    if args.images_dir:
        print(f"Using images directory: {args.images_dir}", file=sys.stderr)
    
    # When run directly, output markdown to stdout (for Electron to capture)
    result = main(limit=args.limit, images_dir=args.images_dir, output_json=args.output_json)
    
    if result.get('markdown'):
        # Output markdown to stdout (for Electron to capture)
        print(result['markdown'])
    else:
        print(f"Error: {result.get('error', 'Unknown error')}", file=sys.stderr)
        sys.exit(1)

