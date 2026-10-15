import { GameGlyph } from '../game-glyph'

// 金币与其他游戏指标共用生成图集
export function RushCoin(props: { size?: number }) {
  return <GameGlyph id="coin" size={props.size ?? 28} className="rush-coin" />
}
