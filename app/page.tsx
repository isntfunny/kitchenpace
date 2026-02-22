import {
    fetchChefSpotlight,
    fetchQuickTips,
    fetchRecentActivities,
    fetchTrendingTags,
} from '@/app/actions/community';
import {
    fetchFeaturedRecipe,
    fetchNewestRecipes,
    fetchTopRatedRecipes,
} from '@/app/actions/recipes';
import { ActivitySidebar } from '@/components/features/ActivitySidebar';
import { ChefSpotlight } from '@/components/features/ChefSpotlight';
import { Header } from '@/components/features/Header';
import { QuickTips } from '@/components/features/QuickTips';
import { RecipeScrollServer } from '@/components/features/RecipeScrollServer';
import { TrendingTags } from '@/components/features/TrendingTags';
import { DailyHighlight } from '@/components/sections/DailyHighlight';
import { FitsNow } from '@/components/sections/FitsNow';
import { FlowPillars } from '@/components/sections/FlowPillars';
import { HeroSpotlight } from '@/components/sections/HeroSpotlight';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

export const revalidate = 60;

export default async function Home() {
    const [
        featuredRecipe,
        newestRecipes,
        topRatedRecipes,
        trendingTags,
        chefSpotlight,
        quickTips,
        recentActivities,
    ] = await Promise.all([
        fetchFeaturedRecipe(),
        fetchNewestRecipes(),
        fetchTopRatedRecipes(),
        fetchTrendingTags(),
        fetchChefSpotlight(),
        fetchQuickTips(),
        fetchRecentActivities(),
    ]);

    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
            })}
        >
            <Header />

            <main
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '8' },
                })}
            >
                <HeroSpotlight />

                <FlowPillars />

                <div
                    className={css({
                        marginTop: '6',
                    })}
                >
                    <div
                        className={grid({
                            columns: { base: 1, lg: 12 },
                            gap: '6',
                        })}
                    >
                        <div className={css({ lg: { gridColumn: 'span 8' } })}>
                            <DailyHighlight recipe={featuredRecipe} />

                            <div
                                className={css({
                                    marginTop: '6',
                                })}
                            >
                                <RecipeScrollServer
                                    title="Neuste Rezepte"
                                    recipes={newestRecipes}
                                />
                            </div>

                            <div
                                className={css({
                                    marginTop: '6',
                                })}
                            >
                                <FitsNow />
                            </div>

                            <div
                                className={css({
                                    marginTop: '6',
                                })}
                            >
                                <RecipeScrollServer title="Top Rated" recipes={topRatedRecipes} />
                            </div>
                        </div>

                        <div className={css({ lg: { gridColumn: 'span 4' } })}>
                            <TrendingTags tags={trendingTags} />
                            <div
                                className={css({
                                    marginTop: '5',
                                })}
                            >
                                <ChefSpotlight chef={chefSpotlight} />
                            </div>
                            <div
                                className={css({
                                    marginTop: '5',
                                })}
                            >
                                <QuickTips tips={quickTips} />
                            </div>
                            <div
                                className={css({
                                    marginTop: '5',
                                })}
                            >
                                <ActivitySidebar activities={recentActivities} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer
                className={css({
                    py: '8',
                    mt: '8',
                    textAlign: 'center',
                    fontFamily: 'body',
                    fontSize: 'sm',
                    color: 'text-muted',
                    bg: '#fffcf9',
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.04)',
                })}
            >
                <div
                    className={css({
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '0 4',
                    })}
                >
                    <div
                        className={css({
                            fontSize: '2xl',
                            marginBottom: '3',
                        })}
                    >
                        🍳
                    </div>
                    <div
                        className={css({
                            fontWeight: '600',
                            color: 'text',
                            marginBottom: '2',
                        })}
                    >
                        KüchenTakt
                    </div>
                    <div>© 2026 KüchenTakt · Produkte mit Gefühl entdecken</div>
                </div>
            </footer>
        </div>
    );
}
