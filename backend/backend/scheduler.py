import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from jobs.edit_detector import run_edit_detection
from jobs.hourly_scrape import run_daily_summaries, run_scrape, run_weekly_cleanup

logger = logging.getLogger(__name__)

IST_OFFSET = "+05:30"


async def _scrape_and_schedule_edit_detection():
    """Run scrape then schedule edit detection 5 minutes later."""
    run_id = await run_scrape()

    # Schedule edit detection 5 minutes from now
    trigger_time = datetime.now(timezone.utc) + timedelta(minutes=5)
    _scheduler.add_job(
        run_edit_detection,
        trigger=DateTrigger(run_date=trigger_time),
        id=f"edit_detection_{run_id}",
        replace_existing=True,
        misfire_grace_time=300,
    )
    logger.info("Edit detection scheduled for %s UTC", trigger_time.strftime("%H:%M:%S"))


_scheduler: AsyncIOScheduler = None  # type: ignore


async def start_scheduler() -> AsyncIOScheduler:
    global _scheduler

    _scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # Hourly scrape on the hour (IST)
    _scheduler.add_job(
        _scrape_and_schedule_edit_detection,
        trigger=CronTrigger(minute=0, timezone="Asia/Kolkata"),
        id="hourly_scrape",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Daily summaries at 00:30 IST
    _scheduler.add_job(
        run_daily_summaries,
        trigger=CronTrigger(hour=0, minute=30, timezone="Asia/Kolkata"),
        id="daily_summaries",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Weekly cleanup Sunday 03:00 IST
    _scheduler.add_job(
        run_weekly_cleanup,
        trigger=CronTrigger(day_of_week="sun", hour=3, minute=0, timezone="Asia/Kolkata"),
        id="weekly_cleanup",
        replace_existing=True,
        misfire_grace_time=7200,
    )

    _scheduler.start()
    logger.info("Scheduler started — hourly scrape, daily summaries, weekly cleanup")
    return _scheduler
