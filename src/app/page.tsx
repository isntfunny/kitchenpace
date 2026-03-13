import { Suspense } from 'react';

import { Header } from '@app/components/features/Header';
import { CategoryBarSection } from '@app/components/home/CategoryBarSection';
import { ChefSpotlightSection } from '@app/components/home/ChefSpotlightSection';
import { DailyHighlightSection } from '@app/components/home/DailyHighlightSection';
import { HelloWorldBanner } from '@app/components/home/HelloWorldBanner';
import { LiveActivitySection } from '@app/components/home/LiveActivitySection';
import { NewestRecipesSection } from '@app/components/home/NewestRecipesSection';
import { QuickTipsSection } from '@app/components/home/QuickTipsSection';
import { TopRatedSection } from '@app/components/home/TopRatedSection';
import { TrendingTagsSection } from '@app/components/home/TrendingTagsSection';
import { AnimatedChefHat } from '@app/components/motion/AnimatedChefHat';
import { FadeInSection } from '@app/components/motion/FadeInSection';
import { FitsNow } from '@app/components/sections/FitsNow';
import { FlowPillars } from '@app/components/sections/FlowPillars';
import { HeroSpotlight } from '@app/components/sections/HeroSpotlight';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

export const revalidate = 60;

function SectionSkeleton({ height = '200px' }: { height?: string }) {
    return (
        <div
            className={css({
                borderRadius: '2xl',
                bg: 'surface',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            })}
            style={{ height }}
        />
    );
}

export default function Home() {
    return (
        <div className={css({ minH: '100vh', color: 'text' })}>
            <Header />

            <main
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '4', md: '5' },
                })}
            >
                <HeroSpotlight />

                <div className={css({ mt: '4' })}>
                    <HelloWorldBanner />
                </div>

                <div className={css({ mt: '4' })}>
                    <Suspense fallback={<SectionSkeleton height="48px" />}>
                        <CategoryBarSection />
                    </Suspense>
                </div>

                <div className={css({ marginTop: '4' })}>
                    <div className={grid({ columns: { base: 1, lg: 12 }, gap: '4' })}>
                        <div className={css({ lg: { gridColumn: 'span 8' } })}>
                            <Suspense fallback={<SectionSkeleton height="320px" />}>
                                <DailyHighlightSection />
                            </Suspense>

                            <div className={css({ marginTop: '4' })}>
                                <Suspense fallback={<SectionSkeleton height="240px" />}>
                                    <NewestRecipesSection />
                                </Suspense>
                            </div>

                            <div className={css({ marginTop: '4' })}>
                                <FitsNow />
                            </div>

                            <div className={css({ marginTop: '4' })}>
                                <Suspense fallback={<SectionSkeleton height="240px" />}>
                                    <TopRatedSection />
                                </Suspense>
                            </div>
                        </div>

                        <FadeInSection
                            delay={0.1}
                            className={css({ lg: { gridColumn: 'span 4' } })}
                        >
                            <Suspense fallback={<SectionSkeleton height="140px" />}>
                                <TrendingTagsSection />
                            </Suspense>

                            <div className={css({ marginTop: '4' })}>
                                <Suspense fallback={<SectionSkeleton height="280px" />}>
                                    <ChefSpotlightSection />
                                </Suspense>
                            </div>

                            <div className={css({ marginTop: '4' })}>
                                <Suspense fallback={<SectionSkeleton height="200px" />}>
                                    <QuickTipsSection />
                                </Suspense>
                            </div>

                            <div className={css({ marginTop: '4' })}>
                                <Suspense fallback={<SectionSkeleton height="300px" />}>
                                    <LiveActivitySection />
                                </Suspense>
                            </div>
                        </FadeInSection>
                    </div>
                </div>

                <div className={css({ mt: '4' })}>
                    <FlowPillars />
                </div>
            </main>

            <footer
                className={css({
                    py: '5',
                    mt: '5',
                    textAlign: 'center',
                    fontFamily: 'body',
                    fontSize: 'sm',
                    color: 'muted',
                    background: 'surface.card',
                    boxShadow: 'shadow.medium',
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
                            color: 'palette.orange',
                        })}
                    >
                        <AnimatedChefHat />
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
