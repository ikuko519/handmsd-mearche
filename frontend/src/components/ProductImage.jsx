import { useState } from 'react'

/**
 * 商品画像。画像URLがない、または読み込めない場合は「商品画像」の枠を表示する。
 */
function ProductImage({ src, alt }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="product-image" aria-hidden="true">
        商品画像
      </div>
    )
  }

  return <img className="product-image" src={src} alt={alt} onError={() => setFailed(true)} />
}

export default ProductImage
